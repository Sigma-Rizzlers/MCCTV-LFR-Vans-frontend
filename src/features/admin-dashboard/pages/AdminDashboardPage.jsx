import { useEffect, useMemo, useState } from "react";
import "../../report-form/styles/layout.css";
import "../../report-form/styles/request.css";
import "../../report-form/styles/form.css";
import "../../report-form/styles/responsive.css";
import "../../report-form/styles/pdf.css";
import "../styles/dashboard.css";
import { loadAdminMissionPanel, saveAdminMissionPanel } from "../../../utils/adminMissionPanel";
import PdfTemplate from "../../report-form/components/PdfTemplate";
import { getRequestStatus, requestStatusLabelMap } from "../../report-form/constants/requestStatus";

const historyStorageKey = "mcctv:mission-request-history";
const fallbackText = "-";
const initialMissionData = {
  missionTitle: "",
  departureDate: "",
  returnDate: "",
  missionPlace: "",
  participantCount: "",
  mission: ""
};

function toText(value) {
  return String(value ?? "").trim();
}

function getParticipantCount(report) {
  const memberCount = Array.isArray(report?.members)
    ? report.members.filter(
      (member) => toText(member?.name) || toText(member?.phone) || toText(member?.role)
    ).length
    : 0;

  if (memberCount > 0) {
    return memberCount;
  }

  return toText(report?.formData?.name) ? 1 : 0;
}

function normalizeDashboardRow(report) {
  if (!report || typeof report !== "object") {
    return null;
  }

  const requestId = toText(report.requestId);
  if (!requestId) {
    return null;
  }

  const formData = report.formData && typeof report.formData === "object" ? report.formData : {};
  const program = toText(formData.missionTitle) || toText(formData.mission) || fallbackText;
  const location = toText(formData.missionPlace) || fallbackText;
  const via = toText(formData.role) || toText(formData.name) || fallbackText;
  const approvalStatus = getRequestStatus(report.approvalStatus);

  return {
    requestId,
    program,
    location,
    participantCount: getParticipantCount(report),
    via,
    approvalStatusLabel: requestStatusLabelMap[approvalStatus]
  };
}

function loadDashboardRows() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(historyStorageKey);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalizeDashboardRow).filter(Boolean);
  } catch (error) {
    console.error(error);
    return [];
  }
}

function loadDashboardReports() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(historyStorageKey);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

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

function countUniqueLocations(rows) {
  return new Set(
    rows
      .map((row) => row.location)
      .filter((location) => location && location !== fallbackText)
  ).size;
}

export default function AdminDashboardPage({ onBackToMain, onLogout }) {
  const [missionData, setMissionData] = useState(initialMissionData);
  const [missionStatusText, setMissionStatusText] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const dashboardReports = useMemo(() => loadDashboardReports(), []);
  const dashboardRows = useMemo(() => dashboardReports.map(normalizeDashboardRow).filter(Boolean), [dashboardReports]);
  const totalParticipants = dashboardRows.reduce((sum, row) => sum + row.participantCount, 0);
  const totalLocations = countUniqueLocations(dashboardRows);

  useEffect(() => {
    const storedMissionPanel = loadAdminMissionPanel();
    if (!storedMissionPanel) {
      return;
    }

    setMissionData((current) => ({ ...current, ...storedMissionPanel }));
  }, []);

  function handleMissionChange(event) {
    const { name, value } = event.target;
    setMissionData((current) => ({ ...current, [name]: value }));
    setMissionStatusText("");
  }

  function handleCreateMissionPanel() {
    const savedPanel = saveAdminMissionPanel(missionData);
    if (!savedPanel) {
      setMissionStatusText("Please fill mission information before creating.");
      return;
    }

    setMissionStatusText("Created successfully. Main page mission panel is updated.");
  }

  function handleClearMissionPanel() {
    setMissionData(initialMissionData);
    saveAdminMissionPanel(null);
    setMissionStatusText("Cleared. Main page reverted to default vehicle package info.");
  }

  return (
    <div className="page admin-dashboard-page notranslate" translate="no" lang="km">
      <header className="topbar">
        <div className="brand">
          <div className="brand-main">
            <div className="seal">
              <img className="brand-logo" src="/mcctv-logo.jpg" alt="MCCTV logo" />
            </div>
            <div className="brand-text">
              <div className="brand-title brand-title-kh">ផ្ទាំងគ្រប់គ្រងអ្នកគ្រប់គ្រង</div>
              <div className="brand-title-en brand-title-system">MCCTV Fleet Administrative Dashboard</div>
            </div>
          </div>
          <div className="brand-title-en brand-title-sub">Mission monitoring and request overview</div>
        </div>
      </header>

      <nav className="nav admin-dashboard-nav">
        <a href="#overview" className="active">
          Dashboard Overview
        </a>
        <a href="#mission-panel">Mission Panel</a>
        <a href="#request-summary">Request Summary</a>
        <div className="admin-actions admin-dashboard-actions-bar">
          <button type="button" className="admin-access-btn admin" onClick={onBackToMain}>
            Main Page
          </button>
          <button type="button" className="admin-access-btn admin" onClick={onLogout}>
            Admin Logout
          </button>
        </div>
      </nav>

      <main className="page-main admin-dashboard-main">
        <section id="overview" className="hero admin-dashboard-hero">
          <div className="hero-content">
            <div className="kicker">Admin Dashboard</div>
            <h1>Same visual language as the main page, focused on admin work.</h1>
            <p>
              Review mission information, keep an eye on submitted requests, and work inside the same MCCTV
              design system instead of a disconnected layout.
            </p>
            <div className="badge-row">
              <span className="badge">Mission Control</span>
              <span className="badge ghost">{dashboardRows.length} saved requests</span>
            </div>
          </div>

          <div className="hero-stats">
            <div className="stat-card">
              <div className="stat-value">{dashboardRows.length}</div>
              <div className="stat-label">Total Requests</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalParticipants}</div>
              <div className="stat-label">Participants Counted</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalLocations}</div>
              <div className="stat-label">Unique Locations</div>
            </div>
          </div>
        </section>

        <section id="mission-panel" className="bundle">
          <div className="bundle-card admin-dashboard-card">
            <div className="bundle-header admin-dashboard-card-header">
              <div>
                <h2>ព័ត៌មានបេសកកម្ម</h2>
                <p>សូមបំពេញព័ត៌មានបេសកកម្មឲ្យបានច្បាស់លាស់។</p>
              </div>
              <span className="pill">Admin Only</span>
            </div>

            <section className="phase-card phase-mission admin-mission-card">
              <div className="field-grid">
                <label className="field full">
                  <span>បេសកកម្ម</span>
                  <input
                    type="text"
                    name="missionTitle"
                    placeholder="បញ្ចូលឈ្មោះបេសកកម្ម"
                    value={missionData.missionTitle}
                    onChange={handleMissionChange}
                  />
                </label>
                <label className="field full">
                  <span>ទីកន្លែងបេសកកម្ម</span>
                  <input
                    type="text"
                    name="missionPlace"
                    placeholder="ឧ. ខេត្ត/រាជធានី, ភូមិ, ឃុំ/សង្កាត់, ស្រុក/ខណ្ឌ"
                    value={missionData.missionPlace}
                    onChange={handleMissionChange}
                  />
                </label>
                <label className="field full">
                  <span>ចំនួនអ្នកចូលរួម</span>
                  <input
                    type="number"
                    name="participantCount"
                    placeholder="បញ្ចូលចំនួនអ្នកចូលរួម"
                    value={missionData.participantCount}
                    onChange={handleMissionChange}
                  />
                </label>
                <label className="field full">
                  <span>តាមរយៈ</span>
                  <textarea
                    name="mission"
                    rows="4"
                    placeholder="តាមរយៈ"
                    value={missionData.mission}
                    onChange={handleMissionChange}
                  />
                </label>
              </div>
              <div className="actions">
                <button className="primary" type="button" onClick={handleCreateMissionPanel}>
                  Create
                </button>
                <button className="ghost" type="button" onClick={handleClearMissionPanel}>
                  Clear
                </button>
                <div className="status">{missionStatusText}</div>
              </div>
            </section>
          </div>
        </section>

        <section id="request-summary" className="bundle">
          <div className="bundle-card admin-dashboard-card">
            <div className="bundle-header admin-dashboard-card-header">
              <div>
                <h2>ទិន្នន័យសំណើរបេសកកម្ម</h2>
                <p>Overview of the request records already stored in the system.</p>
              </div>
              <span className="pill">Live Storage</span>
            </div>

            {dashboardRows.length === 0 ? (
              <p className="admin-dashboard-empty">មិនទាន់មានទិន្នន័យសម្រាប់បង្ហាញទេ។</p>
            ) : (
              <div className="admin-dashboard-table-wrap">
                <table className="admin-dashboard-table">
                  <thead>
                    <tr>
                      <th>កម្មវិធី</th>
                      <th>ទីតាំង</th>
                      <th>ចំនួនអ្នកចូលរួម</th>
                      <th>តាមរយៈ</th>
                      <th>ស្ថានភាពអនុម័ត</th>
                      <th>PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardRows.map((row) => (
                      <tr key={row.requestId}>
                        <td>{row.program}</td>
                        <td>{row.location}</td>
                        <td>{row.participantCount}</td>
                        <td>{row.via}</td>
                        <td>{row.approvalStatusLabel}</td>
                        <td>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() =>
                              setSelectedReport(
                                dashboardReports.find((report) => report.requestId === row.requestId) ?? null
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
            )}
          </div>
        </section>
      </main>
      <PdfTemplate report={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  );
}

