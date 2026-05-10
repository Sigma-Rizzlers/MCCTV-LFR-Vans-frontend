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

function getParticipantCount(report) {
  const memberCount = Array.isArray(report?.members)
    ? report.members.filter(
        (member) => toText(member?.name) || toText(member?.phone) || toText(member?.role)
      ).length
    : 0;

  if (memberCount > 0) return memberCount;
  return toText(report?.formData?.name) ? 1 : 0;
}

function normalizeDashboardRow(report) {
  if (!report || typeof report !== "object") return null;

  const requestId = toText(report.requestId);
  if (!requestId) return null;

  const formData = report.formData && typeof report.formData === "object" ? report.formData : {};
  const adminPanel = report.adminPanel && typeof report.adminPanel === "object" ? report.adminPanel : {};

  const program = toText(adminPanel.missionTitle || formData.missionTitle || formData.mission) || fallbackText;
  const location = toText(adminPanel.missionPlace || formData.missionPlace) || fallbackText;
  const date = toText(formData.departureDate) || toText(report.submittedAt) || fallbackText;
  const rawDuration = toText(formData.travelDuration);
  const duration = rawDuration ? `${rawDuration} ម៉ោង` : fallbackText;

  return {
    requestId,
    program,
    location,
    participantCount: getParticipantCount(report),
    date,
    duration
  };
}

function countUniqueLocations(rows) {
  return new Set(
    rows.map((row) => row.location).filter((loc) => loc && loc !== fallbackText)
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
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const dashboardReports = useMemo(() => loadDashboardReports(), [refreshKey]);
  const dashboardRows = useMemo(
    () => dashboardReports.map(normalizeDashboardRow).filter(Boolean),
    [dashboardReports]
  );
  const totalLocations = countUniqueLocations(dashboardRows);
  const totalParticipants = useMemo(
    () => dashboardRows.reduce((sum, r) => sum + (Number(r.participantCount) || 0), 0),
    [dashboardRows]
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const fromMs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toMs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    return dashboardRows.filter((r) => {
      if (q && !(r.requestId.toLowerCase().includes(q) || r.program.toLowerCase().includes(q) || r.location.toLowerCase().includes(q))) return false;
      if (fromMs || toMs) {
        const rowMs = new Date(r.date).getTime();
        if (!isNaN(rowMs)) {
          if (fromMs && rowMs < fromMs) return false;
          if (toMs && rowMs > toMs) return false;
        }
      }
      return true;
    });
  }, [dashboardRows, searchQuery, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
  const pagedRows = filteredRows.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFrom, dateTo]);

  function handleDeleteReport(requestId) {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(historyStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const next = parsed.filter((r) => r?.requestId !== requestId);
      window.localStorage.setItem(historyStorageKey, JSON.stringify(next));
    } catch (error) {
      console.error(error);
    }
    setSelectedReport(null);
    setRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    function handleStorageChange(event) {
      if (event.key === historyStorageKey) {
        setRefreshKey((k) => k + 1);
      }
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        setRefreshKey((k) => k + 1);
      }
    }
    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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
              <div className="sys-stat-value">{dashboardRows.length}</div>
              <div className="sys-stat-label">សំណើសរុប</div>
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
                placeholder="ស្វែងរក PDF..."
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
            <p className="sys-result-count">{filteredRows.length} លទ្ធផល</p>
          )}

          {dashboardRows.length === 0 ? (
            <p className="sys-table-empty">មិនទាន់មានទិន្នន័យសម្រាប់បង្ហាញទេ។</p>
          ) : filteredRows.length === 0 ? (
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
                      <th>ឯកសារ PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((row) => (
                      <tr key={row.requestId} className="sys-table-row">
                        <td>{row.requestId}</td>
                        <td>{row.program}</td>
                        <td>{row.location}</td>
                        <td>{row.participantCount}</td>
                        <td>{formatDate(row.date)}</td>
                        <td>{row.duration}</td>
                        <td>
                          <button
                            type="button"
                            className="ghost sys-action-btn"
                            onClick={() =>
                              setSelectedReport(
                                dashboardReports.find((r) => r.requestId === row.requestId) ?? null
                              )
                            }
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
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onDelete={selectedReport ? () => handleDeleteReport(selectedReport.requestId) : undefined}
      />
    </div>
  );
}
