import { Fragment, useEffect, useMemo, useState } from "react";
import { loadAccounts, createAccount, updateAccount, deleteAccount, getLastLogin } from "../../../utils/accountStorage";
import { loadAdminMissionPanel, backfillMissionCodes } from "../../../utils/adminMissionPanel";
import { addSysManagerAuditLog, loadSysManagerAuditLog, readLocalAuditLog } from "../../../utils/sysManagerAuditLog";
import requestStore from "../../../store/requestStore";
import { DATA_MODE } from "../../../utils/dataMode";
import { getCachedReports, getCacheAge } from "../../../utils/reportCache";
import OfflineBanner from "../../../components/OfflineBanner";
import {
  getUsers,
  createUser as createUserApi,
  updateUser as updateUserApi,
  deleteUser as deleteUserApi,
  resetPassword as resetPasswordApi,
} from "../../../api/services";
import AdminDashboardPage from "../../admin-dashboard/pages/AdminDashboardPage";
import SuperAdminDashboardPage from "../../super-admin-dashboard/pages/SuperAdminDashboardPage";
import ReportFormPage from "../../report-form/pages/ReportFormPage";
import PdfTemplate from "../../report-form/components/PdfTemplate";
import "../../report-form/styles/index.css";
import "../../report-form/styles/pdf.css";
import "../styles/sysmanager.css";

const historyStorageKey = "mcctv:mission-request-history";

function loadAllReports() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(historyStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r) => r && typeof r === "object" && r.requestId && r.submittedAt)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  } catch {
    return [];
  }
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("km-KH", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("km-KH", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  }).format(date);
}

function timeAgo(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ទើបតែ";
  if (mins < 60) return `${mins} នាទីមុន`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ម៉ោងមុន`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} ថ្ងៃមុន`;
  return formatDate(value);
}

function toText(value) {
  return String(value ?? "").trim();
}

function getMissionKey(report) {
  const missionCode = toText(report.adminPanel?.missionCode || "");
  if (missionCode) return missionCode;
  const title = toText(report.adminPanel?.missionTitle || report.formData?.missionTitle || "");
  const time = toText(report.adminPanel?.missionTime || "");
  return title || time ? `${title}|${time}` : report.requestId;
}

function groupReportsByMission(reports) {
  const map = new Map();
  for (const report of reports) {
    const key = getMissionKey(report);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(report);
  }
  return Array.from(map.values());
}

function normalizeMissionGroup(group) {
  if (!group.length) return null;
  const first = group[0];
  const formData = first.formData || {};
  const adminPanel = first.adminPanel || {};
  const missionCode = toText(adminPanel.missionCode || "");
  const program = toText(adminPanel.missionTitle || formData.missionTitle || formData.mission) || "-";
  const location = toText(adminPanel.missionPlace || formData.missionPlace) || "-";
  const date = toText(formData.departureDate) || toText(first.submittedAt) || "-";
  const travelDuration = toText(formData.travelDuration);
  const duration = travelDuration ? `${travelDuration} ម៉ោង` : adminPanel.missionTime ? formatDateTime(adminPanel.missionTime) : "-";

  return {
    key: missionCode || first.requestId,
    missionCode,
    program,
    location,
    unitCount: group.length,
    date,
    duration,
    submittedAt: first.submittedAt,
    reports: group
  };
}

function normalizeReportRow(report, accounts) {
  const requestId = toText(report.requestId);
  if (!requestId) return null;
  const formData = report.formData || {};
  const adminPanel = report.adminPanel || {};
  const missionCode = toText(adminPanel.missionCode || "");
  const program = toText(adminPanel.missionTitle || formData.missionTitle || formData.mission) || "-";
  const location = toText(adminPanel.missionPlace || formData.missionPlace) || "-";
  const date = toText(formData.departureDate || report.submittedAt) || "-";
  const travelDuration = toText(formData.travelDuration);
  const duration = travelDuration ? `${travelDuration} ម៉ោង` : adminPanel.missionTime ? formatDateTime(adminPanel.missionTime) : "-";
  const submitterUsername = toText(report.submitterUsername);
  const account = accounts.find((a) => a.username === submitterUsername);
  const unitName = account?.unitName || submitterUsername || "-";
  return { requestId, missionCode, unitName, program, location, date, duration, submittedAt: report.submittedAt, raw: report };
}

const ROWS_PER_PAGE = 10;

const accountMenuItems = [
  { id: "users", label: "អ្នកប្រើប្រាស់", role: "user" },
  { id: "admins", label: "អ្នកគ្រប់គ្រង", role: "admin" },
  { id: "superadmins", label: "អ្នកគ្រប់គ្រងជាន់ខ្ពស់", role: "superadmin" }
];

const emptyForm = { unitName: "", username: "", password: "", role: "user" };

function mapApiUser(user) {
  return {
    id: user.id,
    unitName: user.unitName ?? user.username ?? "",
    username: user.username ?? "",
    password: "",
    role: user.role ?? "user",
  };
}

export default function SysManagerDashboardPage({ onLogout }) {
  const [activeMenu, setActiveMenu] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [accounts, setAccounts] = useState(() => loadAccounts());
  const [expandedAccountId, setExpandedAccountId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReports, setSelectedReports] = useState(null);
  const [pdfInitialMode, setPdfInitialMode] = useState("summary");
  const [modalState, setModalState] = useState(null);
  const [formFields, setFormFields] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);
  const [viewingDashboard, setViewingDashboard] = useState(null);
  const [reportsPage, setReportsPage] = useState(1);
  const [auditEntries, setAuditEntries] = useState(() => readLocalAuditLog());

  const [allReports, setAllReports] = useState(() =>
    DATA_MODE === "local" ? loadAllReports() : getCachedReports()
  );
  const [apiWarning, setApiWarning] = useState(false);
  const [cacheAge, setCacheAge] = useState(() => getCacheAge());
  const adminPanel = useMemo(() => loadAdminMissionPanel(), [reportsRefreshKey]);

  useEffect(() => {
    // Backfill missionCode into old reports that are missing it
    backfillMissionCodes();
    if (DATA_MODE === "local") {
      setAllReports(loadAllReports());
      return;
    }
    requestStore.getAll()
      .then((data) => {
        setAllReports(data);
        setApiWarning(false);
        setCacheAge(getCacheAge());
      })
      .catch(() => {
        setAllReports(getCachedReports());
        setApiWarning(true);
      });
  }, [reportsRefreshKey]);

  useEffect(() => {
    if (DATA_MODE === "local") return;
    getUsers().then((res) => {
      const users = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      setAccounts(users.map(mapApiUser));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refreshAuditLog();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleHistoryUpdated() {
      setReportsRefreshKey((k) => k + 1);
    }
    function handleStorageChange(event) {
      if (event.key === "mcctv:mission-request-history") setReportsRefreshKey((k) => k + 1);
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") setReportsRefreshKey((k) => k + 1);
    }
    window.addEventListener("mcctv:history-updated", handleHistoryUpdated);
    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("mcctv:history-updated", handleHistoryUpdated);
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const isReportsView = activeMenu === "reports";
  const isOverview = activeMenu === "overview";
  const isAuditView = activeMenu === "audit";

  const activeRoleFilter = accountMenuItems.find((m) => m.id === activeMenu)?.role ?? "user";

  const filteredAccounts = useMemo(() => {
    if (isReportsView || isOverview || isAuditView) return [];
    const q = searchQuery.toLowerCase();
    return accounts
      .filter((a) => a.role === activeRoleFilter)
      .filter(
        (a) =>
          !q || a.unitName.toLowerCase().includes(q) || a.username.toLowerCase().includes(q)
      );
  }, [accounts, activeRoleFilter, searchQuery, isReportsView, isOverview, isAuditView]);

  const reportRows = useMemo(() => {
    if (!isReportsView) return [];
    const rows = allReports.map((r) => normalizeReportRow(r, accounts)).filter(Boolean);
    const q = searchQuery.toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.missionCode && r.missionCode.toLowerCase().includes(q)) ||
        r.requestId.toLowerCase().includes(q) ||
        r.unitName.toLowerCase().includes(q) ||
        r.program.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q)
    );
  }, [allReports, accounts, searchQuery, isReportsView]);

  const reportsTotalPages = Math.max(1, Math.ceil(reportRows.length / ROWS_PER_PAGE));
  const pagedReportRows = reportRows.slice((reportsPage - 1) * ROWS_PER_PAGE, reportsPage * ROWS_PER_PAGE);

  const missionGroups = useMemo(
    () => groupReportsByMission(allReports).map(normalizeMissionGroup).filter(Boolean),
    [allReports]
  );
  const recentActivity = useMemo(() => missionGroups.slice(0, 10), [missionGroups]);

  const overviewStats = useMemo(() => ({
    totalReports: allReports.length,
    totalUsers: accounts.filter((a) => a.role === "user").length,
    totalAdmins: accounts.filter((a) => a.role === "admin").length,
    totalSuperadmins: accounts.filter((a) => a.role === "superadmin").length,
  }), [allReports, accounts]);

  async function refreshAccountsFromApi() {
    const res = await getUsers();
    const users = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
    setAccounts(users.map(mapApiUser));
  }

  function refreshAll() {
    if (DATA_MODE !== "local") {
      refreshAccountsFromApi().catch(() => {});
    } else {
      setAccounts(loadAccounts());
    }
    setReportsRefreshKey((k) => k + 1);
  }

  function refreshAccounts() {
    if (DATA_MODE !== "local") {
      refreshAccountsFromApi().catch(() => {});
    } else {
      setAccounts(loadAccounts());
    }
  }

  async function refreshAuditLog() {
    setAuditEntries(await loadSysManagerAuditLog());
  }

  function recordAuditLog(entry) {
    setAuditEntries(addSysManagerAuditLog(entry));
  }

  function switchMenu(menuId) {
    setActiveMenu(menuId);
    setSearchQuery("");
    setExpandedAccountId(null);
    setReportsPage(1);
    if (menuId === "reports" || menuId === "overview") setReportsRefreshKey((k) => k + 1);
    if (menuId === "audit") refreshAuditLog();
  }

  function openCreateModal() {
    setFormFields({ ...emptyForm, role: activeRoleFilter });
    setFormError("");
    setModalState({ mode: "create" });
  }

  function openEditModal(account) {
    setFormFields({
      unitName: account.unitName,
      username: account.username,
      password: account.password,
      role: account.role
    });
    setFormError("");
    setModalState({ mode: "edit", account });
  }

  function openResetPasswordModal(account) {
    setFormFields({ ...emptyForm, password: "" });
    setFormError("");
    setModalState({ mode: "reset-password", account });
  }

  function closeModal() {
    setModalState(null);
    setFormError("");
  }

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setFormFields((prev) => ({ ...prev, [name]: value }));
    setFormError("");
  }

  async function handleModalSave() {
    if (DATA_MODE !== "local") {
      try {
        let apiAccount;
        if (modalState.mode === "create") {
          const res = await createUserApi({
            unitName: formFields.unitName,
            username: formFields.username,
            password: formFields.password,
            role: formFields.role,
          });
          apiAccount = mapApiUser(res.data);
        } else if (modalState.mode === "reset-password") {
          if (!formFields.password.trim()) { setFormError("សូមបញ្ចូលពាក្យសម្ងាត់ថ្មី។"); return; }
          await resetPasswordApi(modalState.account.id, formFields.password);
          apiAccount = modalState.account;
        } else {
          const res = await updateUserApi(modalState.account.id, {
            unitName: formFields.unitName,
            username: formFields.username,
            role: formFields.role,
          });
          apiAccount = mapApiUser(res.data);
        }
        if (modalState.mode === "create") {
          recordAuditLog({ action: "បង្កើតគណនី", target: apiAccount.username, detail: `${apiAccount.unitName || "-"} · ${apiAccount.role}` });
        } else if (modalState.mode === "reset-password") {
          recordAuditLog({ action: "កំណត់ Password ថ្មី", target: modalState.account.username, detail: modalState.account.unitName || "-" });
        } else {
          recordAuditLog({ action: "កែប្រែគណនី", target: apiAccount.username, detail: `${apiAccount.unitName || "-"} · ${apiAccount.role}` });
        }
        await refreshAccountsFromApi();
        closeModal();
      } catch {
        setFormError("មានបញ្ហាក្នុងការទំនាក់ទំនង។ សូមសាកល្បងម្ដងទៀត។");
      }
      return;
    }

    let result;
    if (modalState.mode === "create") {
      result = await createAccount(formFields);
    } else if (modalState.mode === "reset-password") {
      if (!formFields.password.trim()) {
        setFormError("សូមបញ្ចូលពាក្យសម្ងាត់ថ្មី។");
        return;
      }
      result = await updateAccount(modalState.account.id, { password: formFields.password });
    } else {
      result = await updateAccount(modalState.account.id, formFields);
    }
    if (result.error) {
      setFormError(result.error);
      return;
    }
    if (modalState.mode === "create") {
      recordAuditLog({
        action: "បង្កើតគណនី",
        target: result.account.username,
        detail: `${result.account.unitName || "-"} · ${result.account.role}`
      });
    } else if (modalState.mode === "reset-password") {
      recordAuditLog({
        action: "កំណត់ Password ថ្មី",
        target: modalState.account.username,
        detail: modalState.account.unitName || "-"
      });
    } else {
      recordAuditLog({
        action: "កែប្រែគណនី",
        target: result.account.username,
        detail: `${result.account.unitName || "-"} · ${result.account.role}`
      });
    }
    refreshAccounts();
    closeModal();
  }

  async function handleDelete(id) {
    const account = accounts.find((item) => item.id === id);
    if (!window.confirm("តើអ្នកពិតជាចង់លុបគណនីនេះមែនទេ?")) return;

    if (DATA_MODE !== "local") {
      try {
        await deleteUserApi(id);
      } catch {}
      if (account) {
        recordAuditLog({ action: "លុបគណនី", target: account.username, detail: `${account.unitName || "-"} · ${account.role}` });
      }
      await refreshAccountsFromApi().catch(() => {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
      });
    } else {
      deleteAccount(id);
      if (account) {
        recordAuditLog({ action: "លុបគណនី", target: account.username, detail: `${account.unitName || "-"} · ${account.role}` });
      }
      refreshAccounts();
    }
    if (expandedAccountId === id) setExpandedAccountId(null);
  }

  function openDashboardView(dashboardName) {
    const labels = {
      user: "User Dashboard",
      admin: "Admin Dashboard",
      superadmin: "Superadmin Dashboard"
    };
    recordAuditLog({
      action: "បើក Dashboard",
      target: labels[dashboardName] || dashboardName,
      detail: "System Manager"
    });
    setViewingDashboard(dashboardName);
  }

  function toggleExpanded(id) {
    setExpandedAccountId((prev) => (prev === id ? null : id));
  }

  function getReportsForUser(username) {
    return allReports.filter((r) => r.submitterUsername === username);
  }

  const menuTitle = isOverview
    ? "ទំព័រដើម"
    : isReportsView
    ? "ទិន្នន័យសំណើ"
    : isAuditView
    ? "កំណត់ត្រាសកម្មភាព"
    : accountMenuItems.find((m) => m.id === activeMenu)?.label ?? "";

  if (viewingDashboard === "admin") {
    return <AdminDashboardPage onLogout={() => setViewingDashboard(null)} />;
  }

  if (viewingDashboard === "superadmin") {
    return <SuperAdminDashboardPage onLogout={() => setViewingDashboard(null)} />;
  }

  if (viewingDashboard === "user") {
    return (
      <ReportFormPage
        authRole="user"
        onAdminLogin={() => setViewingDashboard(null)}
        onAdminLogout={() => setViewingDashboard(null)}
        onOpenAdminDashboard={() => setViewingDashboard("admin")}
      />
    );
  }

  return (
    <div className="page sys-manager-page notranslate" translate="no" lang="km">
      <header className="sys-manager-topbar">
        <div className="sys-manager-brand">
          <img
            src="/about-moi-logo.png"
            alt="Ministry of Interior logo"
            className="sys-manager-logo"
            onError={(e) => { e.currentTarget.src = "/logo.png"; }}
          />
          <div>
            <div className="sys-manager-brand-title">ក្រសួងមហាផ្ទៃ</div>
            <div className="sys-manager-brand-sub">MINISTRY OF INTERIOR</div>
          </div>
        </div>
        <button className="ghost" type="button" onClick={onLogout}>
          ចាកចេញ
        </button>
      </header>

      <div className="sys-manager-body">
        <aside className="sys-manager-sidebar">
          <div className="sys-sidebar-section-label">ទូទៅ</div>
          <nav className="sys-manager-nav">
            <button
              type="button"
              className={`sys-nav-item${activeMenu === "overview" ? " active" : ""}`}
              onClick={() => switchMenu("overview")}
            >
              ទំព័រដើម
            </button>
            <button
              type="button"
              className={`sys-nav-item${activeMenu === "audit" ? " active" : ""}`}
              onClick={() => switchMenu("audit")}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span>កំណត់ត្រាសកម្មភាព</span>
              <span className="sys-nav-badge">{auditEntries.length}</span>
            </button>
          </nav>

          <div className="sys-sidebar-section-label" style={{ marginTop: "16px" }}>គ្រប់គ្រងគណនី</div>
          <nav className="sys-manager-nav">
            {accountMenuItems.map((item) => {
              const count = accounts.filter((a) => a.role === item.role).length;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sys-nav-item${activeMenu === item.id ? " active" : ""}`}
                  onClick={() => switchMenu(item.id)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span>{item.label}</span>
                  <span style={{
                    background: activeMenu === item.id ? "rgba(255,255,255,0.25)" : "rgba(154,120,64,0.15)",
                    color: activeMenu === item.id ? "#fff" : "#9a7840",
                    borderRadius: "10px",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "1px 7px",
                    minWidth: "20px",
                    textAlign: "center"
                  }}>{count}</span>
                </button>
              );
            })}
          </nav>

          <div className="sys-sidebar-section-label" style={{ marginTop: "16px" }}>របាយការណ៍</div>
          <nav className="sys-manager-nav">
            <button
              type="button"
              className={`sys-nav-item${activeMenu === "reports" ? " active" : ""}`}
              onClick={() => switchMenu("reports")}
            >
              ស្វែងរក PDF
            </button>
          </nav>

          <div className="sys-sidebar-section-label" style={{ marginTop: "16px" }}>មើល Dashboard</div>
          <nav className="sys-manager-nav">
            <button
              type="button"
              className="sys-nav-item"
              onClick={() => openDashboardView("user")}
            >
              User Dashboard
            </button>
            <button
              type="button"
              className="sys-nav-item"
              onClick={() => openDashboardView("admin")}
            >
              Admin Dashboard
            </button>
            <button
              type="button"
              className="sys-nav-item"
              onClick={() => openDashboardView("superadmin")}
            >
              Superadmin Dashboard
            </button>
          </nav>
        </aside>

        <main className="sys-manager-main">
          <OfflineBanner />
          {apiWarning && DATA_MODE !== "local" && (
            <div style={{
              background: "#fff3cd", border: "1px solid #ffc107",
              borderRadius: 6, padding: "10px 16px", marginBottom: 16,
              fontSize: 13, color: "#856404", display: "flex", alignItems: "center", gap: 8
            }}>
              <span>⚠️</span>
              <span>កំពុងបង្ហាញទិន្នន័យ Cache — មិនអាចភ្ជាប់ Server</span>
            </div>
          )}

          {/* ── Overview ── */}
          {isOverview && (
            <div className="sys-overview">
              <div className="sys-overview-header">
                <div>
                  <h2 className="sys-manager-content-title">ទំព័រដើម</h2>
                  {cacheAge && DATA_MODE !== "local" && (
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                      បានធ្វើបច្ចុប្បន្នភាព: {new Date(cacheAge).toLocaleString("km-KH")}
                    </div>
                  )}
                </div>
              </div>

              <div className="sys-stat-row">
                <div className="sys-stat-card">
                  <div className="sys-stat-value">{overviewStats.totalReports}</div>
                  <div className="sys-stat-label">សំណើសរុប</div>
                </div>
                <div className="sys-stat-card">
                  <div className="sys-stat-value">{overviewStats.totalUsers}</div>
                  <div className="sys-stat-label">អ្នកប្រើប្រាស់</div>
                </div>
                <div className="sys-stat-card">
                  <div className="sys-stat-value">{overviewStats.totalAdmins}</div>
                  <div className="sys-stat-label">អ្នកគ្រប់គ្រង</div>
                </div>
                <div className="sys-stat-card">
                  <div className="sys-stat-value">{overviewStats.totalSuperadmins}</div>
                  <div className="sys-stat-label">Superadmin</div>
                </div>
              </div>

              <div className="sys-overview-panels">
                <div className="sys-overview-panel sys-overview-panel--wide">
                  <h3 className="sys-panel-title">សកម្មភាពថ្មីៗ — User</h3>
                  {recentActivity.length === 0 ? (
                    <p className="sys-reports-empty">មិនទាន់មានការបញ្ជូនសំណើ</p>
                  ) : (
                    <table className="sys-table">
                      <thead>
                        <tr>
                          <th>លេខកូដ</th>
                          <th>កម្មវិធី</th>
                          <th>ទីតាំង</th>
                          <th>ចំនួនអង្គភាពចូលរួម</th>
                          <th>ពេលវេលា</th>
                          <th>PDF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentActivity.map((row) => (
                          <tr key={row.key} className="sys-table-row">
                            <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                              {row.missionCode ? (
                                <span style={{ fontWeight: 700, color: "#9a6a00", letterSpacing: "0.02em" }}>
                                  {row.missionCode}
                                </span>
                              ) : (
                                row.reports.map((r) => (
                                  <div key={r.requestId}>{r.requestId}</div>
                                ))
                              )}
                            </td>
                            <td>{row.program}</td>
                            <td>{row.location}</td>
                            <td>{row.unitCount}</td>
                            <td style={{ whiteSpace: "nowrap", color: "#9a7840", fontSize: 13 }}>
                              {timeAgo(row.submittedAt)}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              <button
                                type="button"
                                className="ghost sys-action-btn"
                                onClick={() => {
                                  setSelectedReport(null);
                                  setSelectedReports(row.reports);
                                  setPdfInitialMode("summary");
                                }}
                              >
                                សង្ខេប
                              </button>
                              <button
                                type="button"
                                className="ghost sys-action-btn"
                                onClick={() => {
                                  setSelectedReport(null);
                                  setSelectedReports(row.reports);
                                  setPdfInitialMode("full");
                                }}
                              >
                                លម្អិត
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="sys-overview-panel sys-overview-panel--narrow">
                  <h3 className="sys-panel-title">Admin Panel បច្ចុប្បន្ន</h3>
                  {!adminPanel ? (
                    <p className="sys-reports-empty">Admin មិនទាន់កំណត់ទិន្នន័យ</p>
                  ) : (
                    <dl className="sys-panel-dl">
                      {adminPanel.savedAt && (
                        <div className="sys-panel-dl-row sys-panel-dl-row--meta">
                          <dt>រក្សាទុកនៅ</dt>
                          <dd>{formatDateTime(adminPanel.savedAt)}</dd>
                        </div>
                      )}
                      {adminPanel.missionTitle && (
                        <div className="sys-panel-dl-row">
                          <dt>កម្មវិធី</dt>
                          <dd>{adminPanel.missionTitle}</dd>
                        </div>
                      )}
                      {adminPanel.missionPlace && (
                        <div className="sys-panel-dl-row">
                          <dt>ទីតាំង</dt>
                          <dd>{adminPanel.missionPlace}</dd>
                        </div>
                      )}
                      {adminPanel.missionTime && (
                        <div className="sys-panel-dl-row">
                          <dt>ពេលវេលា</dt>
                          <dd>{adminPanel.missionTime}</dd>
                        </div>
                      )}
                      {adminPanel.participantCount && (
                        <div className="sys-panel-dl-row">
                          <dt>ចំនួនអ្នកចូលរួម</dt>
                          <dd>{adminPanel.participantCount}</dd>
                        </div>
                      )}
                      {adminPanel.missionVia && (
                        <div className="sys-panel-dl-row">
                          <dt>តាមរយៈ</dt>
                          <dd>{adminPanel.missionVia}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Reports / PDF search view ── */}
          {isReportsView && (
            <>
              <div className="sys-manager-content-header">
                <div>
                  <h2 className="sys-manager-content-title">ស្វែងរក PDF</h2>
                  {cacheAge && DATA_MODE !== "local" && (
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                      បានធ្វើបច្ចុប្បន្នភាព: {new Date(cacheAge).toLocaleString("km-KH")}
                    </div>
                  )}
                </div>
                <div className="sys-manager-toolbar">
                  <input
                    className="sys-search-input sys-search-input--wide"
                    placeholder="ស្វែងរក តាមលេខកូដ / អង្គភាព / កម្មវិធី / ទីតាំង..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setReportsPage(1); }}
                  />
                  {searchQuery && (
                    <button className="ghost" type="button" onClick={() => setSearchQuery("")}>✕</button>
                  )}
                </div>
              </div>
              <div className="sys-result-count">
                {searchQuery
                  ? `${reportRows.length} លទ្ធផល`
                  : `សំណើសរុប ${reportRows.length}`}
              </div>
              <div className="sys-table-wrap">
                <table className="sys-table">
                  <thead>
                    <tr>
                      <th>លេខកូដ</th>
                      <th>អង្គភាព</th>
                      <th>កម្មវិធី</th>
                      <th>ទីតាំង</th>
                      <th>កាលបរិចេ្ចក</th>
                      <th>រយៈពេល</th>
                      <th>ឯកសារ PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.length === 0 && (
                      <tr>
                        <td colSpan="7" className="sys-table-empty">
                          {searchQuery ? "រកមិនឃើញ" : "មិនទាន់មានទិន្នន័យ"}
                        </td>
                      </tr>
                    )}
                    {pagedReportRows.map((row) => (
                      <tr key={row.requestId} className="sys-table-row">
                        <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                          {row.missionCode ? (
                            <span style={{ fontWeight: 700, color: "#9a6a00", letterSpacing: "0.02em" }}>
                              {row.missionCode}
                            </span>
                          ) : (
                            <span>{row.requestId}</span>
                          )}
                        </td>
                        <td>{row.unitName}</td>
                        <td>{row.program}</td>
                        <td>{row.location}</td>
                        <td>{formatDate(row.date)}</td>
                        <td>{row.duration}</td>
                        <td>
                          <button
                            type="button"
                            className="ghost sys-action-btn"
                            onClick={() => {
                              setSelectedReports(null);
                              setSelectedReport(row.raw);
                            }}
                          >
                            មើល PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {reportsTotalPages > 1 && (
                <div className="table-pagination">
                  <button
                    type="button"
                    className="ghost pagination-btn"
                    disabled={reportsPage <= 1}
                    onClick={() => setReportsPage((p) => p - 1)}
                  >
                    « មុន
                  </button>
                  <span className="pagination-info">
                    ទំព័រ {reportsPage} / {reportsTotalPages}
                  </span>
                  <button
                    type="button"
                    className="ghost pagination-btn"
                    disabled={reportsPage >= reportsTotalPages}
                    onClick={() => setReportsPage((p) => p + 1)}
                  >
                    បន្ទាប់ »
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Accounts view ── */}
          {isAuditView && (
            <>
              <div className="sys-manager-content-header">
                <h2 className="sys-manager-content-title">{menuTitle}</h2>
                <span className="sys-result-count">{auditEntries.length} កំណត់ត្រា</span>
              </div>
              <div className="sys-table-wrap">
                <table className="sys-table">
                  <thead>
                    <tr>
                      <th>ពេលវេលា</th>
                      <th>សកម្មភាព</th>
                      <th>គោលដៅ</th>
                      <th>ព័ត៌មានលម្អិត</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEntries.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="sys-table-empty">មិនទាន់មានកំណត់ត្រាសកម្មភាពទេ។</td>
                      </tr>
                    ) : (
                      auditEntries.map((entry) => (
                        <tr key={entry.id} className="sys-table-row">
                          <td style={{ whiteSpace: "nowrap", color: "#9a7840", fontSize: 13 }}>
                            {formatDateTime(entry.createdAt)}
                          </td>
                          <td>{entry.action}</td>
                          <td>{entry.target || "-"}</td>
                          <td>{entry.detail || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Accounts view ── */}
          {!isReportsView && !isOverview && !isAuditView && (
            <>
              <div className="sys-manager-content-header">
                <h2 className="sys-manager-content-title">{menuTitle}</h2>
                <div className="sys-manager-toolbar">
                  <input
                    className="sys-search-input"
                    placeholder="ស្វែងរក..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="primary" type="button" onClick={openCreateModal}>
                    + បន្ថែមគណនី
                  </button>
                </div>
              </div>
              <div className="sys-table-wrap">
                <table className="sys-table">
                  <thead>
                    <tr>
                      <th>អង្គភាព</th>
                      <th>Username</th>
                      <th>បង្កើតនៅ</th>
                      <th>ចូលចុងក្រោយ</th>
                      <th>សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.length === 0 && (
                      <tr>
                        <td colSpan="5" className="sys-table-empty">
                          {searchQuery ? "រកមិនឃើញ" : "មិនទាន់មានគណនី"}
                        </td>
                      </tr>
                    )}
                    {filteredAccounts.map((account) => {
                      const isExpanded = expandedAccountId === account.id;
                      const userReports =
                        activeMenu === "users" ? getReportsForUser(account.username) : [];
                      const lastLogin = getLastLogin(account.username);

                      return (
                        <Fragment key={account.id}>
                          <tr className="sys-table-row">
                            <td>{account.unitName || "-"}</td>
                            <td>{account.username}</td>
                            <td>{formatDate(account.createdAt)}</td>
                            <td style={{ whiteSpace: "nowrap", color: "#9a7840", fontSize: 13 }}>
                              {lastLogin ? timeAgo(lastLogin) : "-"}
                            </td>
                            <td className="sys-table-actions">
                              {activeMenu === "users" && (
                                <button
                                  type="button"
                                  className={`ghost sys-action-btn${isExpanded ? " active" : ""}`}
                                  onClick={() => toggleExpanded(account.id)}
                                >
                                  {isExpanded ? "បិទ" : `របាយការណ៍ (${userReports.length})`}
                                </button>
                              )}
                              <button
                                type="button"
                                className="ghost sys-action-btn"
                                onClick={() => openEditModal(account)}
                              >
                                កែប្រែ
                              </button>
                              <button
                                type="button"
                                className="ghost sys-action-btn"
                                onClick={() => openResetPasswordModal(account)}
                              >
                                កំណត់ Password
                              </button>
                              <button
                                type="button"
                                className="ghost sys-action-btn sys-action-delete"
                                onClick={() => handleDelete(account.id)}
                              >
                                លុប
                              </button>
                            </td>
                          </tr>

                          {activeMenu === "users" && isExpanded && (
                            <tr className="sys-reports-row">
                              <td colSpan="5">
                                <div className="sys-reports-panel">
                                  <h4 className="sys-reports-title">
                                    របាយការណ៍របស់ {account.unitName || account.username}
                                  </h4>
                                  {userReports.length === 0 ? (
                                    <p className="sys-reports-empty">
                                      មិនទាន់មានរបាយការណ៍ដែលបានបញ្ជូន
                                    </p>
                                  ) : (
                                    <table className="sys-reports-table">
                                      <thead>
                                        <tr>
                                          <th>លេខសំណើ</th>
                                          <th>ថ្ងៃ/ម៉ោង</th>
                                          <th>ឯកសារ</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {userReports.map((report) => (
                                          <tr key={report.requestId}>
                                            <td>{report.requestId}</td>
                                            <td>{formatDateTime(report.submittedAt)}</td>
                                            <td>
                                              <button
                                                type="button"
                                                className="ghost sys-action-btn"
                                                onClick={() => {
                                                  setSelectedReports(null);
                                                  setSelectedReport(report);
                                                }}
                                              >
                                                មើល PDF
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>

      {modalState && (
        <div className="sys-modal-overlay" role="dialog" aria-modal="true">
          <div className="sys-modal-card">
            <div className="sys-modal-header">
              <h3>
                {modalState.mode === "create" ? "បន្ថែមគណនីថ្មី"
                  : modalState.mode === "reset-password" ? `កំណត់ Password — ${modalState.account.username}`
                  : "កែប្រែគណនី"}
              </h3>
              <button type="button" className="ghost" onClick={closeModal}>✕</button>
            </div>
            <div className="sys-modal-body">
              {modalState.mode === "reset-password" ? (
                <label className="sys-field">
                  <span>ពាក្យសម្ងាត់ថ្មី</span>
                  <input
                    type="password"
                    name="password"
                    placeholder="បញ្ចូលពាក្យសម្ងាត់ថ្មី"
                    value={formFields.password}
                    onChange={handleFieldChange}
                    autoComplete="new-password"
                    autoFocus
                  />
                </label>
              ) : (
                <>
                  <label className="sys-field">
                    <span>អង្គភាព</span>
                    <input
                      type="text"
                      name="unitName"
                      placeholder="ឈ្មោះអង្គភាព"
                      value={formFields.unitName}
                      onChange={handleFieldChange}
                    />
                  </label>
                  <label className="sys-field">
                    <span>Username</span>
                    <input
                      type="text"
                      name="username"
                      placeholder="username"
                      value={formFields.username}
                      onChange={handleFieldChange}
                      autoComplete="off"
                    />
                  </label>
                  <label className="sys-field">
                    <span>Password</span>
                    <input
                      type="password"
                      name="password"
                      placeholder="password"
                      value={formFields.password}
                      onChange={handleFieldChange}
                      autoComplete="new-password"
                    />
                  </label>
                  <label className="sys-field">
                    <span>តួនាទី</span>
                    <select name="role" value={formFields.role} onChange={handleFieldChange}>
                      <option value="user">User (អ្នកប្រើប្រាស់)</option>
                      <option value="admin">Admin (អ្នកគ្រប់គ្រង)</option>
                      <option value="superadmin">Superadmin (អ្នកគ្រប់គ្រងជាន់ខ្ពស់)</option>
                    </select>
                  </label>
                </>
              )}
              {formError && <p className="sys-form-error">{formError}</p>}
            </div>
            <div className="sys-modal-footer">
              <button className="primary" type="button" onClick={handleModalSave}>
                {modalState.mode === "create" ? "បង្កើត" : "រក្សាទុក"}
              </button>
              <button className="ghost" type="button" onClick={closeModal}>បោះបង់</button>
            </div>
          </div>
        </div>
      )}

      <PdfTemplate
        key={
          selectedReports?.length
            ? `${selectedReports[0]?.requestId ?? "group"}-${pdfInitialMode}`
            : selectedReport?.requestId ?? "single"
        }
        report={selectedReport}
        reports={selectedReports}
        initialMode={pdfInitialMode}
        onClose={() => {
          setSelectedReport(null);
          setSelectedReports(null);
        }}
      />
    </div>
  );
}
