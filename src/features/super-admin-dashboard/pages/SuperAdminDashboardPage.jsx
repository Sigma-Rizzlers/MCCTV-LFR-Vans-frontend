import { useEffect, useMemo, useState } from "react";
import "../../report-form/styles/layout.css";
import "../../report-form/styles/request.css";
import "../../report-form/styles/form.css";
import "../../report-form/styles/responsive.css";
import "../../report-form/styles/pdf.css";
import "../../admin-dashboard/styles/dashboard.css";
import "../../sys-manager/styles/sysmanager.css";
import PdfTemplate from "../../report-form/components/PdfTemplate";

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
  const rawDuration = toText(formData.travelDuration);
  const duration = rawDuration ? `${rawDuration} ម៉ោង` : fallbackText;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const dashboardReports = useMemo(() => loadDashboardReports(), [refreshKey]);
  const missionGroups = useMemo(
    () => groupReportsByMission(dashboardReports).map(normalizeMissionGroup).filter(Boolean),
    [dashboardReports]
  );
  const totalLocations = useMemo(() => countUniqueLocations(missionGroups), [missionGroups]);
  const totalParticipants = useMemo(
    () => missionGroups.reduce((sum, g) => sum + g.participantCount, 0),
    [missionGroups]
  );

  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const fromMs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toMs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    return missionGroups.filter((g) => {
      if (q && !(
        g.program.toLowerCase().includes(q) ||
        g.location.toLowerCase().includes(q) ||
        g.reports.some((r) => r.requestId.toLowerCase().includes(q))
      )) return false;
      if (fromMs || toMs) {
        const rowMs = new Date(g.date).getTime();
        if (!isNaN(rowMs)) {
          if (fromMs && rowMs < fromMs) return false;
          if (toMs && rowMs > toMs) return false;
        }
      }
      return true;
    });
  }, [missionGroups, searchQuery, dateFrom, dateTo]);

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
    setRefreshKey((k) => k + 1);
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
          <div className="sys-stat-row" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "24px" }}>
            <div className="sys-stat-card">
              <div className="sys-stat-value">{missionGroups.length}</div>
              <div className="sys-stat-label">បេសកកម្មសរុប</div>
            </div>
            <div className="sys-stat-card">
              <div className="sys-stat-value">{totalLocations}</div>
              <div className="sys-stat-label">ទីតាំងសរុប</div>
            </div>
            <div className="sys-stat-card">
              <div className="sys-stat-value">{totalParticipants}</div>
              <div className="sys-stat-label">អ្នកចូលរួមសរុប</div>
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

          {missionGroups.length === 0 ? (
            <p className="sys-table-empty">មិនទាន់មានទិន្នន័យសម្រាប់បង្ហាញទេ។</p>
          ) : filteredGroups.length === 0 ? (
            <p className="sys-table-empty">រកមិនឃើញ</p>
          ) : (
            <>
              <div className="sys-table-wrap">
                <table className="sys-table">
                  <thead>
                    <tr>
                      <th>កម្មវិធី</th>
                      <th>ទីតាំង</th>
                      <th>ចំនួនអង្គភាពចូលរួម</th>
                      <th>កាលបរិចេ្ចក</th>
                      <th>រយៈពេល</th>
                      <th>ឯកសារ PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedGroups.map((group) => (
                      <tr key={group.key} className="sys-table-row">
                        <td>{group.program}</td>
                        <td>{group.location}</td>
                        <td>{group.unitCount}</td>
                        <td>{formatDate(group.date)}</td>
                        <td>{group.duration}</td>
                        <td>
                          <button
                            type="button"
                            className="ghost sys-action-btn"
                            onClick={() => setSelectedReports(group.reports)}
                          >
                            មើល PDF
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

      <PdfTemplate
        reports={selectedReports}
        onClose={() => setSelectedReports(null)}
        onDelete={
          selectedReports
            ? () => handleDeleteReports(selectedReports.map((r) => r.requestId))
            : undefined
        }
      />
    </div>
  );
}
