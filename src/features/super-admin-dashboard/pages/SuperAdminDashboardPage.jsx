import { useEffect, useMemo, useState } from "react";
import "../../report-form/styles/layout.css";
import "../../report-form/styles/request.css";
import "../../report-form/styles/form.css";
import "../../report-form/styles/responsive.css";
import "../../report-form/styles/pdf.css";
import "../../admin-dashboard/styles/dashboard.css";
import "../../sys-manager/styles/sysmanager.css";
import PdfTemplate from "../../report-form/components/PdfTemplate";
import { loadAccounts } from "../../../utils/accountStorage";
import { loadReportFiles, REPORT_FILE_FIELDS } from "../../../utils/reportFileStore";
import { backfillMissionCodes } from "../../../utils/adminMissionPanel";
import requestStore from "../../../store/requestStore";
import { DATA_MODE } from "../../../utils/dataMode";
import { migrateToBackend } from "../../../utils/localMigration";
import { getCachedReports, getCacheAge, cacheReport } from "../../../utils/reportCache";
import { approveVanRequest, mapBackendVanRequest } from "../../../api/services";
import OfflineBanner from "../../../components/OfflineBanner";

const historyStorageKey = "mcctv:mission-request-history";
const fallbackText = "-";
const ROWS_PER_PAGE = 10;

function toText(value) {
  return String(value ?? "").trim();
}

function formatDate(value) {
  if (!value) return fallbackText;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("km-KH", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function formatDateTime(value) {
  if (!value) return fallbackText;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("km-KH", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  }).format(date);
}

function getMissionKey(report) {
  const missionCode = toText(report.adminPanel?.missionCode || "");
  if (missionCode) return missionCode;
  const title = toText(report.adminPanel?.missionTitle || report.formData?.missionTitle || "");
  const time = toText(report.adminPanel?.missionTime || "");
  return (title || time) ? `${title}|${time}` : report.requestId;
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
  const program = toText(adminPanel.missionTitle || formData.missionTitle || formData.mission) || fallbackText;
  const location = toText(adminPanel.missionPlace || formData.missionPlace) || fallbackText;
  const date = toText(formData.departureDate) || toText(first.submittedAt) || fallbackText;
  const missionTime = toText(adminPanel.missionTime);
  const duration = missionTime ? formatDateTime(missionTime) : fallbackText;
  return {
    key: missionCode || first.requestId,
    missionCode,
    program,
    location,
    unitCount: group.length,
    date,
    duration,
    reports: group,
    participantCount: Number(adminPanel.participantCount) || 0,
  };
}

function countUniqueLocations(groups) {
  return new Set(
    groups.map((g) => g.location).filter((loc) => loc && loc !== fallbackText)
  ).size;
}

function getReportUnitName(report, accounts) {
  const submitterUsername = toText(report?.submitterUsername);
  const account = accounts.find((item) => item.username === submitterUsername);
  return account?.unitName || submitterUsername || fallbackText;
}

function isGroupInDateRange(group, dateFrom, dateTo) {
  const fromMs = dateFrom ? new Date(dateFrom).getTime() : null;
  const toMs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
  if (!fromMs && !toMs) return true;

  const rowMs = new Date(group.date).getTime();
  if (Number.isNaN(rowMs)) return true;
  if (fromMs && rowMs < fromMs) return false;
  if (toMs && rowMs > toMs) return false;
  return true;
}

function loadDashboardReports() {
  if (typeof window === "undefined") return [];
  try {
    const rawValue = window.localStorage.getItem(historyStorageKey);
    if (!rawValue) return [];
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (report) =>
        report &&
        typeof report === "object" &&
        toText(report.requestId) &&
        toText(report.submittedAt)
    );
  } catch (error) {
    console.error(error);
    return [];
  }
}

function BarChart({ items, labelKey, valueKey, color }) {
  const max = Math.max(...items.map((d) => d[valueKey]), 1);
  if (items.length === 0) {
    return <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "20px 0" }}>មិនមានទិន្នន័យ</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      {items.map((item, i) => {
        const pct = (item[valueKey] / max) * 100;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 120, fontSize: 12, color: "#555", textAlign: "right", flexShrink: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3
            }} title={item[labelKey]}>
              {item[labelKey]}
            </div>
            <div style={{
              flex: 1, background: "rgba(200,147,24,0.09)",
              borderRadius: 6, height: 32, overflow: "hidden"
            }}>
              <div style={{
                width: `${pct}%`, height: "100%",
                background: color || "#c89318",
                borderRadius: 6,
                transition: "width 0.65s cubic-bezier(.4,0,.2,1)",
                minWidth: item[valueKey] > 0 ? 6 : 0
              }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#111", minWidth: 32, textAlign: "right" }}>
              {item[valueKey]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const sessionRoleKey = "mcctv:session-role";

function emptyMigrationState() {
  return {
    status: "pending",
    reports: { total: 0, done: 0, synced: 0, failed: 0 },
    panels: { total: 0, done: 0, synced: 0, failed: 0 },
    users: { total: 0, done: 0, created: 0, skipped: 0, failed: 0 },
    log: [],
  };
}

export default function SuperAdminDashboardPage({ onBackToMain, onLogout }) {
  const [activeSection, setActiveSection] = useState("missions");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedReports, setSelectedReports] = useState(null);
  const [pdfInitialMode, setPdfInitialMode] = useState("summary");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailGroup, setDetailGroup] = useState(null);
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState(null);
  const [pdfMissionGroup, setPdfMissionGroup] = useState(null);
  const [migrationState, setMigrationState] = useState(null);
  const [approveError, setApproveError] = useState("");
  const [approveLoading, setApproveLoading] = useState(new Set());
  const [apiWarning, setApiWarning] = useState(false);
  const [cacheAge, setCacheAge] = useState(() => getCacheAge());
  const [imageViewReport, setImageViewReport] = useState(null);
  const [imageViewFiles, setImageViewFiles] = useState({});
  const [imageViewLoading, setImageViewLoading] = useState(false);
  const [imageViewUrls, setImageViewUrls] = useState({});

  const currentRole = typeof window !== "undefined"
    ? (window.sessionStorage.getItem(sessionRoleKey) ?? "")
    : "";
  const showMigration = DATA_MODE !== "local" &&
    (currentRole === "superadmin" || currentRole === "sysmanager");

  const [dashboardReports, setDashboardReports] = useState(() =>
    DATA_MODE === "local" ? loadDashboardReports() : getCachedReports()
  );

  useEffect(() => {
    // Backfill missionCode into old reports that are missing it
    const patched = backfillMissionCodes();
    if (DATA_MODE === "local") {
      setDashboardReports(loadDashboardReports());
      return;
    }
    // If patched > 0 and using API mode, still show local data with codes filled
    if (patched > 0) {
      setDashboardReports(loadDashboardReports());
    }
    requestStore.getAll()
      .then((data) => {
        setDashboardReports(data);
        setApiWarning(false);
        setCacheAge(getCacheAge());
      })
      .catch(() => {
        setDashboardReports(getCachedReports());
        setApiWarning(true);
      });
  }, [refreshKey]);

  const accounts = useMemo(() => loadAccounts(), [refreshKey]);
  const missionGroups = useMemo(
    () => groupReportsByMission(dashboardReports).map(normalizeMissionGroup).filter(Boolean),
    [dashboardReports]
  );
  const dateFilteredGroups = useMemo(
    () => missionGroups.filter((group) => isGroupInDateRange(group, dateFrom, dateTo)),
    [missionGroups, dateFrom, dateTo]
  );
  const summaryStats = useMemo(
    () => ({
      totalMissions: dateFilteredGroups.length,
      totalUnits: dateFilteredGroups.reduce((sum, group) => sum + group.unitCount, 0),
      totalParticipants: dateFilteredGroups.reduce((sum, group) => sum + group.participantCount, 0),
      totalLocations: countUniqueLocations(dateFilteredGroups)
    }),
    [dateFilteredGroups]
  );

  const analytics = useMemo(() => {
    const now = new Date();

    // Last 6 months — missions and participants per month
    const monthly = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const yr = d.getFullYear();
      const mo = d.getMonth();
      const label = new Intl.DateTimeFormat("km-KH", { year: "numeric", month: "short" }).format(d);
      const matching = missionGroups.filter((g) => {
        const gd = new Date(g.date);
        return !Number.isNaN(gd.getTime()) && gd.getFullYear() === yr && gd.getMonth() === mo;
      });
      return {
        label,
        missions: matching.length,
        participants: matching.reduce((s, g) => s + g.participantCount, 0),
      };
    });

    // Top 6 locations by mission count
    const locMap = new Map();
    missionGroups.forEach((g) => {
      const loc = toText(g.location);
      if (loc && loc !== fallbackText) locMap.set(loc, (locMap.get(loc) || 0) + 1);
    });
    const topLocations = [...locMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([loc, count]) => ({ loc, count }));

    // Top 6 units by submission count
    const unitMap = new Map();
    dashboardReports.forEach((r) => {
      const acct = accounts.find((a) => a.username === r.submitterUsername);
      const label = toText(acct?.unitName) || toText(r.submitterUsername) || "Unknown";
      unitMap.set(label, (unitMap.get(label) || 0) + 1);
    });
    const topUnits = [...unitMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([unit, count]) => ({ unit, count }));

    // Total all-time stats (unfiltered)
    const allTimeMissions = missionGroups.length;
    const allTimeParticipants = missionGroups.reduce((s, g) => s + g.participantCount, 0);
    const allTimeLocations = countUniqueLocations(missionGroups);
    const allTimeUnits = new Set(dashboardReports.map((r) => toText(r.submitterUsername)).filter(Boolean)).size;

    return { monthly, topLocations, topUnits, allTimeMissions, allTimeParticipants, allTimeLocations, allTimeUnits };
  }, [missionGroups, dashboardReports, accounts]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = dateFilteredGroups.filter((g) => {
      if (!q) return true;
      if (g.missionCode && g.missionCode.toLowerCase().includes(q)) return true;
      if (g.program.toLowerCase().includes(q)) return true;
      if (g.location.toLowerCase().includes(q)) return true;
      if (g.duration.toLowerCase().includes(q)) return true;
      if (String(g.unitCount).includes(q)) return true;
      if (g.date && g.date.toLowerCase().includes(q)) return true;
      if (formatDate(g.date).toLowerCase().includes(q)) return true;
      return g.reports.some((r) => {
        if (r.requestId.toLowerCase().includes(q)) return true;
        const username = toText(r.submitterUsername).toLowerCase();
        if (username.includes(q)) return true;
        const account = accounts.find((a) => a.username === r.submitterUsername);
        if (account && toText(account.unitName).toLowerCase().includes(q)) return true;
        if (toText(r.formData?.missionTitle).toLowerCase().includes(q)) return true;
        if (toText(r.formData?.missionPlace).toLowerCase().includes(q)) return true;
        return false;
      });
    });
    return sortOrder === "oldest"
      ? [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date))
      : [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [dateFilteredGroups, searchQuery, sortOrder, accounts]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / ROWS_PER_PAGE));
  const pagedGroups = filteredGroups.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFrom, dateTo, sortOrder]);

  useEffect(() => {
    function handleStorageChange(event) {
      if (event.key === historyStorageKey) setRefreshKey((k) => k + 1);
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") setRefreshKey((k) => k + 1);
    }
    function handleHistoryUpdated() {
      setRefreshKey((k) => k + 1);
    }
    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("mcctv:history-updated", handleHistoryUpdated);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("mcctv:history-updated", handleHistoryUpdated);
    };
  }, []);

  async function handleDeleteReports(requestIds) {
    const idSet = new Set(Array.isArray(requestIds) ? requestIds : [requestIds]);
    const toDelete = dashboardReports.filter((r) => idSet.has(r.requestId));
    await Promise.allSettled(
      toDelete.map((r) => requestStore.remove(r.id ?? r.requestId))
    );
    setSelectedReports(null);
    setDetailGroup(null);
    setDeleteConfirmGroup(null);
    setPdfMissionGroup(null);
    setRefreshKey((k) => k + 1);
  }

  function openMissionPdf(group, mode) {
    setSelectedReports(group.reports);
    setPdfMissionGroup(group);
    setPdfInitialMode(mode);
  }

  async function openImageView(report) {
    setImageViewReport(report);
    setImageViewFiles({});
    setImageViewUrls({});
    setImageViewLoading(true);
    try {
      const files = await loadReportFiles(report.requestId, REPORT_FILE_FIELDS);
      const urls = {};
      for (const [slot, blob] of Object.entries(files)) {
        if (blob) urls[slot] = URL.createObjectURL(blob);
      }
      setImageViewFiles(files);
      setImageViewUrls(urls);
    } catch {
      // show empty state
    } finally {
      setImageViewLoading(false);
    }
  }

  function closeImageView() {
    Object.values(imageViewUrls).forEach((url) => URL.revokeObjectURL(url));
    setImageViewReport(null);
    setImageViewFiles({});
    setImageViewUrls({});
  }

  function confirmDeleteMission() {
    if (!deleteConfirmGroup) return;
    handleDeleteReports(deleteConfirmGroup.reports.map((report) => report.requestId));
  }

  async function handleApprove(report, action) {
    const remoteId = report.id;
    if (!remoteId) return;
    setApproveLoading((prev) => new Set([...prev, report.requestId]));
    try {
      const res = await approveVanRequest(remoteId, action);
      const mapped = mapBackendVanRequest(res.data);
      cacheReport(mapped);
      setDashboardReports((prev) =>
        prev.map((r) => r.requestId === report.requestId ? mapped : r)
      );
      setDetailGroup((prev) => {
        if (!prev) return prev;
        return { ...prev, reports: prev.reports.map((r) => r.requestId === report.requestId ? mapped : r) };
      });
    } catch {
      setApproveError("ការអនុម័ត/បដិសេធបរាជ័យ — សូមសាកល្បងម្ដងទៀត");
    } finally {
      setApproveLoading((prev) => { const next = new Set(prev); next.delete(report.requestId); return next; });
    }
  }

  async function startMigration() {
    setMigrationState((prev) => ({ ...emptyMigrationState(), status: "running", log: prev?.log ?? [] }));

    function onProgress({ type, done, total, status, item }) {
      setMigrationState((prev) => {
        if (!prev) return prev;
        const section = prev[type === "report" ? "reports" : type === "panel" ? "panels" : "users"];
        const next = { ...prev };
        if (type === "report") {
          next.reports = {
            total,
            done,
            synced: done - (prev.reports.failed + (status !== "synced" ? 1 : 0)),
            failed: status === "failed" ? prev.reports.failed + 1 : prev.reports.failed,
          };
          if (status === "synced") next.reports.synced = prev.reports.synced + 1;
        } else if (type === "panel") {
          next.panels = {
            total,
            done,
            synced: status === "synced" ? prev.panels.synced + 1 : prev.panels.synced,
            failed: status === "failed" ? prev.panels.failed + 1 : prev.panels.failed,
          };
        } else {
          next.users = {
            total,
            done,
            created: status === "created" ? prev.users.created + 1 : prev.users.created,
            skipped: status === "skipped" ? prev.users.skipped + 1 : prev.users.skipped,
            failed: status === "failed" ? prev.users.failed + 1 : prev.users.failed,
          };
        }
        next.log = [...prev.log, { type, item, status }].slice(-200);
        return next;
      });
    }

    try {
      const results = await migrateToBackend(onProgress);
      setMigrationState((prev) => ({
        ...prev,
        status: "complete",
        reports: results.reports,
        panels: results.panels,
        users: results.users,
      }));
      setRefreshKey((k) => k + 1);
    } catch {
      setMigrationState((prev) => prev ? { ...prev, status: "complete" } : prev);
    }
  }

  return (
    <div className="sys-manager-page notranslate" translate="no" lang="km">
      <header className="sys-manager-topbar">
        <div className="sys-manager-brand">
          <img
            className="sys-manager-logo"
            src="/about-moi-logo.png"
            alt="Ministry of Interior logo"
            onError={(event) => { event.currentTarget.src = "/logo.png"; }}
          />
          <div>
            <div className="sys-manager-brand-title">ក្រសួងមហាផ្ទៃ</div>
            <div className="sys-manager-brand-sub">MINISTRY OF INTERIOR</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {onBackToMain ? (
            <button type="button" className="ghost" onClick={onBackToMain}>ទំព័រដើម</button>
          ) : null}
          <button type="button" className="ghost" onClick={onLogout}>ចាកចេញ</button>
        </div>
      </header>

      <div className="sys-manager-body">
        <aside className="sys-manager-sidebar">
          <div className="sys-sidebar-section-label">ទូទៅ</div>
          <nav className="sys-manager-nav">
            <button
              type="button"
              className={`sys-nav-item${activeSection === "missions" ? " active" : ""}`}
              onClick={() => { setActiveSection("missions"); setRefreshKey((k) => k + 1); }}
            >
              ទិន្នន័យសំណើ
            </button>
            <button
              type="button"
              className={`sys-nav-item${activeSection === "stats" ? " active" : ""}`}
              onClick={() => setActiveSection("stats")}
            >
              ស្ថិតិ &amp; វិភាគ
            </button>
          </nav>
          {showMigration && (
            <>
              <div className="sys-sidebar-section-label" style={{ marginTop: 16 }}>ទិន្នន័យ</div>
              <nav className="sys-manager-nav">
                <button
                  type="button"
                  className="sys-nav-item"
                  onClick={() => setMigrationState(emptyMigrationState())}
                  style={{ color: "#7a5820" }}
                >
                  ផ្ទេរទិន្នន័យ Local
                </button>
              </nav>
            </>
          )}
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
          {activeSection === "missions" && (<>
          <div className="sys-stat-row" style={{ marginBottom: "24px" }}>
            <div className="sys-stat-card">
              <div className="sys-stat-value">{summaryStats.totalMissions}</div>
              <div className="sys-stat-label">បេសកកម្មសរុប</div>
            </div>
            <div className="sys-stat-card">
              <div className="sys-stat-value">{summaryStats.totalUnits}</div>
              <div className="sys-stat-label">អង្គភាពចូលរួម</div>
            </div>
            <div className="sys-stat-card">
              <div className="sys-stat-value">{summaryStats.totalParticipants}</div>
              <div className="sys-stat-label">អ្នកចូលរួមសរុប</div>
            </div>
            <div className="sys-stat-card">
              <div className="sys-stat-value">{summaryStats.totalLocations}</div>
              <div className="sys-stat-label">ទីតាំងសរុប</div>
            </div>
          </div>

          <div className="sys-manager-content-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 className="sys-manager-content-title">ទិន្នន័យសំណើរបេសកកម្ម</h2>
              <button
                type="button"
                className="ghost"
                style={{ fontSize: 13, padding: "4px 10px" }}
                title="ផ្ទុកឡើងវិញ"
                onClick={() => setRefreshKey((k) => k + 1)}
              >
                ↺ Refresh
              </button>
              {cacheAge && DATA_MODE !== "local" && (
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  បានធ្វើបច្ចុប្បន្នភាព: {new Date(cacheAge).toLocaleString("km-KH")}
                </div>
              )}
            </div>
            <div className="sys-manager-toolbar">
              <input
                className="sys-search-input sys-search-input--wide"
                placeholder="ស្វែងរក..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="ghost" type="button" onClick={() => setSearchQuery("")}>✕</button>
              )}
              <input
                type="date"
                className="sys-search-input"
                title="ចាប់ពីថ្ងៃ"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ width: "150px" }}
              />
              <input
                type="date"
                className="sys-search-input"
                title="ដល់ថ្ងៃ"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ width: "150px" }}
              />
              {(dateFrom || dateTo) && (
                <button className="ghost" type="button" onClick={() => { setDateFrom(""); setDateTo(""); }}>✕ ថ្ងៃ</button>
              )}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid rgba(199, 145, 44, 0.4)",
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "inherit",
                  background: "#fff",
                  color: "#111",
                  outline: "none",
                  cursor: "pointer",
                  minWidth: 140
                }}
                title="តម្រៀបតាម"
              >
                <option value="newest">ថ្មី → ចាស់</option>
                <option value="oldest">ចាស់ → ថ្មី</option>
              </select>
            </div>
          </div>

          {(searchQuery || dateFrom || dateTo) && (
            <p className="sys-result-count">{filteredGroups.length} លទ្ធផល</p>
          )}
          {filteredGroups.length > 0 ? (
            <p className="superadmin-table-hint">ចុចលើជួរដេកណាមួយ ដើម្បីមើលព័ត៌មានលម្អិតរបស់អង្គភាពចូលរួម ដោយមិនចាំបាច់បើក PDF ជាមុន។</p>
          ) : null}

          {missionGroups.length === 0 ? (
            <p className="sys-table-empty">
              មិនទាន់មានទិន្នន័យសម្រាប់បង្ហាញទេ។ មុខងារចុចមើលលម្អិត និងបញ្ជាក់មុនលុប នឹងបង្ហាញនៅពេលមានសំណើបេសកកម្ម។
            </p>
          ) : filteredGroups.length === 0 ? (
            <p className="sys-table-empty">រកមិនឃើញ</p>
          ) : (
            <>
              <div className="sys-table-wrap">
                <table className="sys-table">
                  <thead>
                    <tr>
                      <th>លេខកូដ</th>
                      <th>កម្មវិធី</th>
                      <th>ទីតាំង</th>
                      <th>ចំនួនអង្គភាពចូលរួម សរុប</th>
                      <th>កាលបរិចេ្ចក</th>
                      <th>រយៈពេល</th>
                      <th>សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedGroups.map((group) => (
                      <tr
                        key={group.key}
                        className="sys-table-row superadmin-clickable-row"
                        tabIndex={0}
                        onClick={() => setDetailGroup(group)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setDetailGroup(group);
                          }
                        }}
                      >
                        <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                          {group.missionCode ? (
                            <span style={{ fontWeight: 700, color: "#9a6a00", letterSpacing: "0.02em" }}>
                              {group.missionCode}
                              {group.reports.some((r) => r.editHistory?.length > 0) && (
                                <span style={{
                                  marginLeft: 5, fontSize: 10, background: "#9a7840", color: "#fff",
                                  borderRadius: "3px", padding: "1px 4px", fontWeight: 700, verticalAlign: "middle"
                                }}>កែ</span>
                              )}
                            </span>
                          ) : (
                            group.reports.map((r) => (
                              <div key={r.requestId}>
                                {r.requestId}
                                {r.editHistory?.length > 0 && (
                                  <span style={{
                                    marginLeft: 4, fontSize: 10, background: "#9a7840", color: "#fff",
                                    borderRadius: "3px", padding: "1px 4px", fontWeight: 700, verticalAlign: "middle"
                                  }}>កែ</span>
                                )}
                              </div>
                            ))
                          )}
                        </td>
                        <td>{group.program}</td>
                        <td>{group.location}</td>
                        <td>{group.unitCount}</td>
                        <td>{formatDate(group.date)}</td>
                        <td>{group.duration}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            className="ghost sys-action-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              openMissionPdf(group, "summary");
                            }}
                          >
                            PDF សង្ខេប
                          </button>
                          <button
                            type="button"
                            className="ghost sys-action-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              openMissionPdf(group, "full");
                            }}
                          >
                            PDF លម្អិត
                          </button>
                          <button
                            type="button"
                            className="ghost sys-action-btn sys-action-delete"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteConfirmGroup(group);
                            }}
                          >
                            លុប
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="table-pagination">
                  <button
                    type="button"
                    className="ghost pagination-btn"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    « មុន
                  </button>
                  <span className="pagination-info">
                    ទំព័រ {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="ghost pagination-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    បន្ទាប់ »
                  </button>
                </div>
              )}
            </>
          )}
          </>)}

          {activeSection === "stats" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <h2 className="sys-manager-content-title" style={{ margin: 0 }}>ស្ថិតិ &amp; វិភាគ</h2>

              {/* All-time overview */}
              <div className="sys-stat-row">
                <div className="sys-stat-card">
                  <div className="sys-stat-value">{analytics.allTimeMissions}</div>
                  <div className="sys-stat-label">បេសកកម្មសរុប</div>
                </div>
                <div className="sys-stat-card">
                  <div className="sys-stat-value">{analytics.allTimeParticipants}</div>
                  <div className="sys-stat-label">អ្នកចូលរួមសរុប</div>
                </div>
                <div className="sys-stat-card">
                  <div className="sys-stat-value">{analytics.allTimeLocations}</div>
                  <div className="sys-stat-label">ទីតាំងសរុប</div>
                </div>
                <div className="sys-stat-card">
                  <div className="sys-stat-value">{analytics.allTimeUnits}</div>
                  <div className="sys-stat-label">អង្គភាពចូលរួម</div>
                </div>
              </div>

              {/* Charts — locked 2-column grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                {/* Monthly missions */}
                <div className="sys-overview-panel">
                  <div style={{
                    padding: "14px 20px", borderBottom: "1px solid rgba(199,145,44,0.15)",
                    background: "linear-gradient(180deg,rgba(248,217,139,0.18),transparent)"
                  }}>
                    <h3 style={{ margin: 0, fontFamily: "var(--font-kh-heading)", fontSize: 14, color: "#3d2402" }}>
                      បេសកកម្មប្រចាំខែ
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9a7840" }}>6 ខែចុងក្រោយ</p>
                  </div>
                  <div style={{ padding: "20px 22px" }}>
                    <BarChart items={analytics.monthly} labelKey="label" valueKey="missions" color="#c89318" />
                  </div>
                </div>

                {/* Monthly participants */}
                <div className="sys-overview-panel">
                  <div style={{
                    padding: "14px 20px", borderBottom: "1px solid rgba(199,145,44,0.15)",
                    background: "linear-gradient(180deg,rgba(248,217,139,0.18),transparent)"
                  }}>
                    <h3 style={{ margin: 0, fontFamily: "var(--font-kh-heading)", fontSize: 14, color: "#3d2402" }}>
                      អ្នកចូលរួមប្រចាំខែ
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9a7840" }}>6 ខែចុងក្រោយ</p>
                  </div>
                  <div style={{ padding: "20px 22px" }}>
                    <BarChart items={analytics.monthly} labelKey="label" valueKey="participants" color="#2d7a4f" />
                  </div>
                </div>

                {/* Top locations */}
                <div className="sys-overview-panel">
                  <div style={{
                    padding: "14px 20px", borderBottom: "1px solid rgba(199,145,44,0.15)",
                    background: "linear-gradient(180deg,rgba(248,217,139,0.18),transparent)"
                  }}>
                    <h3 style={{ margin: 0, fontFamily: "var(--font-kh-heading)", fontSize: 14, color: "#3d2402" }}>
                      ទីតាំងដែលចូលញឹកញាប់
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9a7840" }}>Top 6</p>
                  </div>
                  <div style={{ padding: "20px 22px" }}>
                    <BarChart items={analytics.topLocations} labelKey="loc" valueKey="count" color="#c89318" />
                  </div>
                </div>

                {/* Top units */}
                <div className="sys-overview-panel">
                  <div style={{
                    padding: "14px 20px", borderBottom: "1px solid rgba(199,145,44,0.15)",
                    background: "linear-gradient(180deg,rgba(248,217,139,0.18),transparent)"
                  }}>
                    <h3 style={{ margin: 0, fontFamily: "var(--font-kh-heading)", fontSize: 14, color: "#3d2402" }}>
                      អង្គភាពដែលបំពេញបេសកកម្មច្រើន
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9a7840" }}>Top 6</p>
                  </div>
                  <div style={{ padding: "20px 22px" }}>
                    <BarChart items={analytics.topUnits} labelKey="unit" valueKey="count" color="#7a5820" />
                  </div>
                </div>

              </div>
            </div>
          )}
        </main>
      </div>

      {detailGroup ? (
        <div
          className="superadmin-drawer-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="missionDetailTitle"
          onClick={() => setDetailGroup(null)}
        >
          <aside className="superadmin-detail-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="superadmin-detail-header">
              <div>
                <p className="superadmin-detail-kicker">
                  {detailGroup.missionCode || detailGroup.reports[0]?.requestId || "-"}
                </p>
                <h3 id="missionDetailTitle">{detailGroup.program}</h3>
                <p>{[detailGroup.location, formatDate(detailGroup.date), `${detailGroup.unitCount} អង្គភាព`].join(" · ")}</p>
              </div>
              <button type="button" className="ghost" onClick={() => setDetailGroup(null)}>បិទ</button>
            </div>

            <div className="superadmin-detail-actions">
              <button type="button" className="primary" onClick={() => openMissionPdf(detailGroup, "summary")}>
                PDF សង្ខេប
              </button>
              <button type="button" className="ghost" onClick={() => openMissionPdf(detailGroup, "full")}>
                PDF លម្អិត
              </button>
              <button type="button" className="ghost sys-action-delete" onClick={() => setDeleteConfirmGroup(detailGroup)}>
                លុបបេសកកម្ម
              </button>
            </div>

            <div className="superadmin-detail-list">
              {detailGroup.reports.map((report, index) => (
                <div className="superadmin-detail-item" key={report.requestId}>
                  <div className="superadmin-detail-index">{index + 1}</div>
                  <div>
                    <strong>{getReportUnitName(report, accounts)}</strong>
                    <span>{report.requestId}</span>
                    {report.approvalStatus && (
                      <span style={{
                        marginLeft: 6, fontSize: 11, padding: "1px 6px", borderRadius: 4,
                        background: report.approvalStatus === "approved" ? "#dcfce7"
                          : report.approvalStatus === "rejected" ? "#fee2e2" : "#fef9c3",
                        color: report.approvalStatus === "approved" ? "#166534"
                          : report.approvalStatus === "rejected" ? "#991b1b" : "#854d0e",
                      }}>
                        {report.approvalStatus === "approved" ? "អនុម័ត"
                          : report.approvalStatus === "rejected" ? "បដិសេធ" : "រង់ចាំ"}
                      </span>
                    )}
                  </div>
                  <div>{formatDateTime(report.submittedAt)}</div>
                  <button
                    type="button"
                    className="ghost sys-action-btn"
                    onClick={() => {
                      setPdfInitialMode("summary");
                      setPdfMissionGroup(null);
                      setSelectedReports([report]);
                    }}
                  >
                    មើល PDF
                  </button>
                  <button
                    type="button"
                    className="ghost sys-action-btn"
                    onClick={() => openImageView(report)}
                  >
                    រូបភាព
                  </button>
                  {report.id && DATA_MODE !== "local" && (
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {report.approvalStatus !== "approved" && (
                        <button
                          type="button"
                          className="ghost"
                          style={{ fontSize: 12, padding: "3px 8px", color: "#16a34a" }}
                          disabled={approveLoading.has(report.requestId)}
                          onClick={() => handleApprove(report, "approve")}
                        >
                          អនុម័ត
                        </button>
                      )}
                      {report.approvalStatus !== "rejected" && (
                        <button
                          type="button"
                          className="ghost"
                          style={{ fontSize: 12, padding: "3px 8px", color: "#b3261e" }}
                          disabled={approveLoading.has(report.requestId)}
                          onClick={() => handleApprove(report, "reject")}
                        >
                          បដិសេធ
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      {imageViewReport ? (
        <div
          className="sys-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="imageViewTitle"
          onClick={closeImageView}
        >
          <div className="sys-modal-card superadmin-image-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sys-modal-header">
              <div>
                <h3 id="imageViewTitle">រូបភាព / ឯកសារ</h3>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#7a6846" }}>
                  {getReportUnitName(imageViewReport, accounts)} · {imageViewReport.requestId}
                </p>
              </div>
              <button type="button" className="ghost" onClick={closeImageView}>បិទ</button>
            </div>
            <div className="sys-modal-body">
              {imageViewLoading ? (
                <p style={{ textAlign: "center", color: "#7a6846", padding: "32px 0" }}>កំពុងផ្ទុក...</p>
              ) : Object.values(imageViewUrls).every((u) => !u) ? (
                <p style={{ textAlign: "center", color: "#7a6846", padding: "32px 0" }}>មិនមានរូបភាព ឬ ឯកសារទេ</p>
              ) : (
                <div className="superadmin-image-grid">
                  {[
                    { slot: "support",        label: "ឯកសារគាំទ្រ" },
                    { slot: "lodging",        label: "ទីកន្លែងស្នាក់នៅ" },
                    { slot: "breakfast",      label: "អាហារព្រឹក" },
                    { slot: "lunch",          label: "អាហារថ្ងៃ" },
                    { slot: "dinner",         label: "អាហារល្ងាច" },
                    { slot: "implementation", label: "ការអនុវត្តន៍" },
                  ].map(({ slot, label }) => {
                    const url = imageViewUrls[slot];
                    const blob = imageViewFiles[slot];
                    if (!url) return null;
                    const isPdf = blob?.type === "application/pdf";
                    return (
                      <div key={slot} className="superadmin-image-item">
                        <p className="superadmin-image-label">{label}</p>
                        {isPdf ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="superadmin-image-pdf-link"
                          >
                            📄 {blob.name || "មើលឯកសារ PDF"}
                          </a>
                        ) : (
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={url}
                              alt={label}
                              className="superadmin-image-thumb"
                            />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirmGroup ? (
        <div className="sys-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="deleteMissionTitle">
          <div className="sys-modal-card superadmin-delete-modal">
            <div className="sys-modal-header">
              <h3 id="deleteMissionTitle">លុបបេសកកម្ម</h3>
              <button type="button" className="ghost" onClick={() => setDeleteConfirmGroup(null)}>បិទ</button>
            </div>
            <div className="sys-modal-body">
              <p className="superadmin-delete-warning">
                តើអ្នកពិតជាចង់លុបបេសកកម្មនេះមែនទេ?
              </p>
              <dl className="sys-panel-dl">
                <div className="sys-panel-dl-row">
                  <dt>លេខបេសកកម្ម</dt>
                  <dd>{deleteConfirmGroup.missionCode || deleteConfirmGroup.reports[0]?.requestId || "-"}</dd>
                </div>
                <div className="sys-panel-dl-row">
                  <dt>កម្មវិធី</dt>
                  <dd>{deleteConfirmGroup.program}</dd>
                </div>
                <div className="sys-panel-dl-row">
                  <dt>ចំនួនសំណើ</dt>
                  <dd>{deleteConfirmGroup.reports.length}</dd>
                </div>
              </dl>
            </div>
            <div className="sys-modal-footer">
              <button type="button" className="ghost" onClick={() => setDeleteConfirmGroup(null)}>
                បោះបង់
              </button>
              <button type="button" className="primary superadmin-delete-confirm" onClick={confirmDeleteMission}>
                លុប
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {approveError && (
        <div role="alert" style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 200,
          background: "#fef2f2", border: "1px solid #fca5a5",
          borderRadius: 8, padding: "12px 16px", color: "#991b1b",
          fontSize: 13, maxWidth: 320, display: "flex", alignItems: "center", gap: 12
        }}>
          <span>⚠ {approveError}</span>
          <button
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b", padding: 0, fontSize: 16 }}
            onClick={() => setApproveError("")}
          >✕</button>
        </div>
      )}

      <PdfTemplate
        key={(selectedReports?.[0]?.requestId ?? "none") + "-" + pdfInitialMode}
        reports={selectedReports}
        initialMode={pdfInitialMode}
        onClose={() => {
          setSelectedReports(null);
          setPdfMissionGroup(null);
        }}
        onDelete={
          selectedReports && pdfMissionGroup
            ? () => {
              setSelectedReports(null);
              setDeleteConfirmGroup(pdfMissionGroup);
            }
            : undefined
        }
      />

      {migrationState ? (
        <div className="sys-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="migrationModalTitle">
          <div className="sys-modal-card" style={{ maxWidth: 540, width: "100%" }}>
            <div className="sys-modal-header">
              <h3 id="migrationModalTitle">ផ្ទេរទិន្នន័យ Local → Backend</h3>
              {migrationState.status !== "running" && (
                <button type="button" className="ghost" onClick={() => setMigrationState(null)}>បិទ</button>
              )}
            </div>

            <div className="sys-modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {migrationState.status === "pending" && (
                <>
                  <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6 }}>
                    ប្រតិបត្តិការនេះនឹងផ្ទេរទិន្នន័យដែលរក្សាទុកនៅ localStorage ទៅកាន់ FastAPI backend។
                    ការដំណើរការម្ដងទៀតគឺមានសុវត្ថិភាព — សំណើ/ប្លង់ដែលបានបញ្ចូលរួចហើយនឹងត្រូវបានរំលង។
                  </p>
                  <ul style={{ fontSize: 13, color: "#555", paddingLeft: 18, lineHeight: 2 }}>
                    <li>សំណើបេសកកម្ម (localStorage → van-requests)</li>
                    <li>ប្លង់បេសកកម្ម (localStorage → admin-panel)</li>
                    <li>គណនីអ្នកប្រើ (localStorage → users, password="reset-required")</li>
                    <li>ឯកសារ IndexedDB (files → /files/{"{slot}"}/)</li>
                  </ul>
                  <p style={{ fontSize: 12, color: "#9a7840", fontStyle: "italic" }}>
                    ទិន្នន័យ localStorage នឹង​មិន​ត្រូវ​បាន​លុប — វា​នឹង​ត្រូវ​បាន​រក្សា​ទុក​ជា​ cache offline។
                  </p>
                </>
              )}

              {(migrationState.status === "running" || migrationState.status === "complete") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { key: "reports", label: "សំណើ", done: migrationState.reports.done, total: migrationState.reports.total, synced: migrationState.reports.synced, failed: migrationState.reports.failed },
                    { key: "panels", label: "ប្លង់", done: migrationState.panels.done, total: migrationState.panels.total, synced: migrationState.panels.synced, failed: migrationState.panels.failed },
                    { key: "users", label: "គណនី", done: migrationState.users.done, total: migrationState.users.total, synced: migrationState.users.created + migrationState.users.skipped, failed: migrationState.users.failed },
                  ].map(({ key, label, done, total, synced, failed }) => (
                    <div key={key}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{label}</span>
                        <span style={{ color: "#555" }}>
                          {done}/{total}
                          {synced > 0 && <span style={{ color: "#2d7a4f", marginLeft: 8 }}>✓ {synced}</span>}
                          {failed > 0 && <span style={{ color: "#c0392b", marginLeft: 6 }}>✗ {failed}</span>}
                        </span>
                      </div>
                      <div style={{ height: 8, background: "rgba(200,147,24,0.12)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: total > 0 ? `${(done / total) * 100}%` : "0%",
                          background: failed > 0 ? "#e67e22" : "#2d7a4f",
                          borderRadius: 4,
                          transition: "width 0.3s ease",
                        }} />
                      </div>
                    </div>
                  ))}

                  {migrationState.log.length > 0 && (
                    <div style={{
                      maxHeight: 160, overflowY: "auto",
                      background: "#fafafa", border: "1px solid rgba(199,145,44,0.2)",
                      borderRadius: 6, padding: "8px 10px",
                      fontSize: 12, lineHeight: 1.7, fontFamily: "monospace",
                    }}>
                      {migrationState.log.slice(-50).map((entry, i) => (
                        <div key={i} style={{ color: entry.status === "failed" ? "#c0392b" : entry.status === "skipped" ? "#9a7840" : "#2d7a4f" }}>
                          {entry.status === "synced" || entry.status === "created" ? "✓" : entry.status === "skipped" ? "↷" : "✗"}{" "}
                          [{entry.type}] {entry.item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {migrationState.status === "complete" && (
                <div style={{
                  background: "rgba(45,122,79,0.08)", border: "1px solid rgba(45,122,79,0.3)",
                  borderRadius: 6, padding: "12px 14px", fontSize: 13, lineHeight: 1.8,
                }}>
                  <strong style={{ display: "block", marginBottom: 4 }}>ការផ្ទេរទិន្នន័យបានបញ្ចប់</strong>
                  <span>សំណើ: {migrationState.reports.synced} ✓ / {migrationState.reports.failed} ✗</span><br />
                  <span>ប្លង់: {migrationState.panels.synced} ✓ / {migrationState.panels.failed} ✗</span><br />
                  <span>គណនី: {migrationState.users.created} បង្កើត / {migrationState.users.skipped} មានស្រាប់ / {migrationState.users.failed} ✗</span>
                  {migrationState.users.created > 0 && (
                    <p style={{ marginTop: 8, color: "#9a7840", fontStyle: "italic", fontSize: 12 }}>
                      គណនីដែលបានផ្ទេរប្រើ password="reset-required" — អ្នកប្រើត្រូវ reset password នៅដំណើរការ login ដំបូង។
                    </p>
                  )}
                  <p style={{ marginTop: 6, color: "#555", fontSize: 12 }}>
                    ទិន្នន័យ localStorage នៅតែត្រូវបានរក្សា ជា offline cache។
                    Switch VITE_DATA_MODE="api" ដើម្បីប្រើ Postgres ជា primary source។
                  </p>
                </div>
              )}
            </div>

            <div className="sys-modal-footer">
              {migrationState.status === "pending" && (
                <>
                  <button type="button" className="ghost" onClick={() => setMigrationState(null)}>
                    បោះបង់
                  </button>
                  <button type="button" className="primary" onClick={startMigration}>
                    ចាប់ផ្ដើមផ្ទេរ
                  </button>
                </>
              )}
              {migrationState.status === "running" && (
                <span style={{ fontSize: 13, color: "#9a7840" }}>កំពុងដំណើរការ...</span>
              )}
              {migrationState.status === "complete" && (
                <button type="button" className="primary" onClick={() => setMigrationState(null)}>
                  បញ្ចប់
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
