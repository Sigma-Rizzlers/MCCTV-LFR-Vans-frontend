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
  const program = toText(adminPanel.missionTitle || formData.missionTitle || formData.mission) || fallbackText;
  const location = toText(adminPanel.missionPlace || formData.missionPlace) || fallbackText;
  const date = toText(formData.departureDate) || toText(first.submittedAt) || fallbackText;
  const missionTime = toText(adminPanel.missionTime);
  const duration = missionTime ? formatDateTime(missionTime) : fallbackText;
  return {
    key: first.requestId,
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

export default function SuperAdminDashboardPage({ onBackToMain, onLogout }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedReports, setSelectedReports] = useState(null);
  const [pdfInitialMode, setPdfInitialMode] = useState("summary");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailGroup, setDetailGroup] = useState(null);
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState(null);
  const [pdfMissionGroup, setPdfMissionGroup] = useState(null);

  const dashboardReports = useMemo(() => loadDashboardReports(), [refreshKey]);
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

  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return dateFilteredGroups.filter((g) => {
      if (q && !(
        g.program.toLowerCase().includes(q) ||
        g.location.toLowerCase().includes(q) ||
        g.reports.some((r) => r.requestId.toLowerCase().includes(q))
      )) return false;
      return true;
    });
  }, [dateFilteredGroups, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / ROWS_PER_PAGE));
  const pagedGroups = filteredGroups.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFrom, dateTo]);

  useEffect(() => {
    function handleStorageChange(event) {
      if (event.key === historyStorageKey) setRefreshKey((k) => k + 1);
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") setRefreshKey((k) => k + 1);
    }
    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  function handleDeleteReports(requestIds) {
    if (typeof window === "undefined") return;
    const idSet = new Set(Array.isArray(requestIds) ? requestIds : [requestIds]);
    try {
      const raw = window.localStorage.getItem(historyStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      window.localStorage.setItem(
        historyStorageKey,
        JSON.stringify(parsed.filter((r) => !idSet.has(r?.requestId)))
      );
    } catch (error) {
      console.error(error);
    }
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

  function confirmDeleteMission() {
    if (!deleteConfirmGroup) return;
    handleDeleteReports(deleteConfirmGroup.reports.map((report) => report.requestId));
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
            <div className="sys-manager-brand-title">ផ្ទាំងគ្រប់គ្រងអ្នកគ្រប់គ្រងជាន់ខ្ពស់</div>
            <div className="sys-manager-brand-sub">Super Admin Dashboard</div>
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
            <button type="button" className="sys-nav-item active">ទិន្នន័យសំណើ</button>
          </nav>
        </aside>

        <main className="sys-manager-main">
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
            <h2 className="sys-manager-content-title">ទិន្នន័យសំណើរបេសកកម្ម</h2>
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
                      <th>ចំនួនអង្គភាពចូលរួម</th>
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
                          {group.reports[0]?.requestId ?? "-"}
                          {group.reports.some((r) => r.editHistory?.length > 0) && (
                            <span style={{
                              marginLeft: 5, fontSize: 10, background: "#9a7840", color: "#fff",
                              borderRadius: "3px", padding: "1px 5px", fontWeight: 700, verticalAlign: "middle"
                            }}>កែ</span>
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
                <p className="superadmin-detail-kicker">{detailGroup.reports[0]?.requestId ?? "-"}</p>
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
                </div>
              ))}
            </div>
          </aside>
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
                  <dt>លេខកូដ</dt>
                  <dd>{deleteConfirmGroup.reports[0]?.requestId ?? "-"}</dd>
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
    </div>
  );
}
