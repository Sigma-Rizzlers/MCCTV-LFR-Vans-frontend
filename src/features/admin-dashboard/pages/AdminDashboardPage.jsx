import { useEffect, useMemo, useRef, useState } from "react";
import "../../report-form/styles/layout.css";
import "../../report-form/styles/request.css";
import "../../report-form/styles/form.css";
import "../../report-form/styles/responsive.css";
import "../../report-form/styles/pdf.css";
import "../styles/dashboard.css";
import { loadAdminMissionPanel, sanitizeAdminMissionPanel, saveAdminMissionPanel } from "../../../utils/adminMissionPanel";
import {
  clearAdminMissionFile,
  createAdminMissionFileKey,
  saveAdminMissionFile
} from "../../../utils/adminMissionFileStore";
import PdfTemplate from "../../report-form/components/PdfTemplate";

const historyStorageKey = "mcctv:mission-request-history";
const fallbackText = "-";
const initialMissionData = {
  missionTitle: "",
  missionPlace: "",
  missionTime: "",
  participantCount: "",
  missionVia: "",
  requestPlanFileName: "",
  requestPlanFileDataUrl: "",
  requestPlanFileKey: "",
  requestPlanFileType: ""
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

  return {
    requestId,
    program,
    location,
    participantCount: getParticipantCount(report),
    via
  };
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
  const requestPlanFileInputRef = useRef(null);
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

  async function handleRequestPlanFileChange(file) {
    if (!file) {
      await handleClearRequestPlanFile();
      return;
    }

    try {
      const savedFile = await saveAdminMissionFile(file, createAdminMissionFileKey());
      setMissionData((current) => ({
        ...current,
        requestPlanFileName: savedFile?.name ?? "",
        requestPlanFileDataUrl: "",
        requestPlanFileKey: savedFile?.key ?? "",
        requestPlanFileType: savedFile?.type ?? ""
      }));
      setMissionStatusText("");
    } catch (error) {
      console.error(error);
      setMissionStatusText("មិនអាចរក្សាទុកឯកសារនេះបានទេ។ សូមសាកល្បងម្ដងទៀត។");
      if (requestPlanFileInputRef.current) {
        requestPlanFileInputRef.current.value = "";
      }
    }
  }

  async function handleClearRequestPlanFile() {
    const savedMissionPanel = loadAdminMissionPanel();
    const savedFileKey = savedMissionPanel?.requestPlanFileKey || "";
    const currentFileKey = missionData.requestPlanFileKey;

    if (currentFileKey && currentFileKey !== savedFileKey) {
      try {
        await clearAdminMissionFile(currentFileKey);
      } catch (error) {
        console.error(error);
      }
    }

    setMissionData((current) => ({
      ...current,
      requestPlanFileName: "",
      requestPlanFileDataUrl: "",
      requestPlanFileKey: "",
      requestPlanFileType: ""
    }));
    setMissionStatusText("");

    if (requestPlanFileInputRef.current) {
      requestPlanFileInputRef.current.value = "";
    }
  }

  async function handleCreateMissionPanel() {
    const previousSavedPanel = loadAdminMissionPanel();
    const savedPanel = saveAdminMissionPanel(missionData);
    if (!savedPanel) {
      setMissionStatusText(
        sanitizeAdminMissionPanel(missionData)
          ? "មិនអាចរក្សាទុកឯកសារនេះបានទេ។ សូមសាកល្បងឯកសារដែលមានទំហំតូចជាងនេះ។"
          : "សូមបំពេញព័ត៌មានបេសកកម្មមុនពេលបង្កើត។"
      );
      return;
    }

    const previousFileKey = previousSavedPanel?.requestPlanFileKey || "";
    const nextFileKey = savedPanel.requestPlanFileKey || "";
    if (previousFileKey && previousFileKey !== nextFileKey) {
      try {
        await clearAdminMissionFile(previousFileKey);
      } catch (error) {
        console.error(error);
      }
    }

    setMissionStatusText("បានបង្កើតដោយជោគជ័យ។ ព័ត៌មានបេសកកម្មនៅទំព័រដើមត្រូវបានអាប់ដេត។");
  }

  async function handleClearMissionPanel() {
    const savedMissionPanel = loadAdminMissionPanel();
    const fileKeys = new Set(
      [savedMissionPanel?.requestPlanFileKey, missionData.requestPlanFileKey].filter(Boolean)
    );

    setMissionData(initialMissionData);
    saveAdminMissionPanel(null);

    for (const fileKey of fileKeys) {
      try {
        await clearAdminMissionFile(fileKey);
      } catch (error) {
        console.error(error);
      }
    }

    if (requestPlanFileInputRef.current) {
      requestPlanFileInputRef.current.value = "";
    }
    setMissionStatusText("បានសម្អាត។ ព័ត៌មាននៅទំព័រដើមត្រឡប់ទៅលំនាំដើមវិញ។");
  }

  return (
    <div className="page admin-dashboard-page notranslate" translate="no" lang="km">
      <header className="topbar">
        <div className="brand">
          <div className="brand-main">
            <div className="seal">
              <img className="brand-logo" src="/about-moi-logo.png" alt="Ministry of Interior logo" />
            </div>
            <div className="brand-text">
              <div className="brand-title brand-title-kh">ផ្ទាំងគ្រប់គ្រងអ្នកគ្រប់គ្រង</div>
              <div className="brand-title-en brand-title-system">ផ្ទាំងគ្រប់គ្រងរដ្ឋបាលក្រសួងមហាផ្ទៃ</div>
            </div>
          </div>
          <div className="brand-title-en brand-title-sub">តាមដានបេសកកម្ម និងទិន្នន័យសំណើ</div>
        </div>
      </header>

      <nav className="nav admin-dashboard-nav">
        <a href="#overview" className="active">
          ទិដ្ឋភាពទូទៅ
        </a>
        <div className="admin-actions admin-dashboard-actions-bar">
          {onBackToMain ? (
            <button type="button" className="admin-access-btn admin" onClick={onBackToMain}>
              ទំព័រដើម
            </button>
          ) : null}
          <button type="button" className="admin-access-btn admin" onClick={onLogout}>
            ចាកចេញ
          </button>
        </div>
      </nav>

      <main className="page-main admin-dashboard-main">
        <section id="mission-panel" className="bundle">
          <div className="bundle-card admin-dashboard-card">
            <section className="phase-card phase-mission admin-mission-card">
              <div className="phase-header admin-mission-main-header">
                <h3>ពត៌មានកម្មវិធី</h3>
              </div>
              <div className="field-grid">
                <label className="field full">
                  <span>កម្មវិធី</span>
                  <input
                    type="text"
                    name="missionTitle"
                    placeholder="បញ្ចូលឈ្មោះកម្មវិធី"
                    value={missionData.missionTitle}
                    onChange={handleMissionChange}
                  />
                </label>
                <label className="field">
                  <span>ទីតាំង</span>
                  <input
                    type="text"
                    name="missionPlace"
                    placeholder="ឧ. ខេត្ត/រាជធានី, ភូមិ, ឃុំ/សង្កាត់, ស្រុក/ខណ្ឌ"
                    value={missionData.missionPlace}
                    onChange={handleMissionChange}
                  />
                </label>
                <label className="field">
                  <span>ពេលវេលា</span>
                  <input
                    type="text"
                    name="missionTime"
                    placeholder="ឧ. 08:00 ព្រឹក - 11:30 ថ្ងៃទី 31/03/2026"
                    value={missionData.missionTime}
                    onChange={handleMissionChange}
                  />
                </label>
                <label className="field">
                  <span>ទំហអ្នកចូលរួម</span>
                  <input
                    type="number"
                    name="participantCount"
                    placeholder="បញ្ចូលចំនួនអ្នកចូលរួម"
                    value={missionData.participantCount}
                    onChange={handleMissionChange}
                  />
                </label>
                <label className="field">
                  <span>តាមរយៈ</span>
                  <input
                    type="text"
                    name="missionVia"
                    placeholder="បញ្ចូលឈ្មោះ ឬមធ្យោបាយពាក់ព័ន្ធ"
                    value={missionData.missionVia}
                    onChange={handleMissionChange}
                  />
                </label>
              </div>
              <div className="actions">
                <button className="primary" type="button" onClick={handleCreateMissionPanel}>
                  បង្កើត
                </button>
                <button className="ghost" type="button" onClick={handleClearMissionPanel}>
                  សម្អាត
                </button>
                <div className="status">{missionStatusText}</div>
              </div>
            </section>

            <section className="phase-card admin-mission-card admin-mission-upload-card">
              <div className="phase-header admin-mission-upload-header">
                <h3>ឯកសារស្នើសុំផែនការ កំលាំង និងសម្ភារៈបច្ចេកទេស</h3>
              </div>
              <div className="upload-block admin-mission-upload-block">
                <label className="upload-area" htmlFor="requestPlanFile">
                  <span className="upload-icon" aria-hidden="true">
                    ↑
                  </span>
                  <span className="upload-text">បញ្ចូលឯកសារ</span>
                  <input
                    id="requestPlanFile"
                    ref={requestPlanFileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    onChange={(event) => handleRequestPlanFileChange(event.target.files?.[0] ?? null)}
                  />
                </label>
                {missionData.requestPlanFileName ? (
                  <div className="upload-file-actions">
                    <p className="status">{missionData.requestPlanFileName}</p>
                    <button className="ghost upload-remove" type="button" onClick={handleClearRequestPlanFile}>
                      លុបឯកសារ
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </section>

        <section id="overview" className="hero admin-dashboard-hero">
          <div className="hero-stats">
            <div className="stat-card">
              <div className="stat-value">{dashboardRows.length}</div>
              <div className="stat-label">សំណើសរុប</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalParticipants}</div>
              <div className="stat-label">ចំនួនអ្នកចូលរួម</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalLocations}</div>
              <div className="stat-label">ទីតាំងសរុប</div>
            </div>
          </div>
        </section>

        <section id="request-summary" className="bundle">
          <div className="bundle-card admin-dashboard-card">
            <div className="bundle-header admin-dashboard-card-header">
              <div>
                <h2>ទិន្នន័យសំណើរបេសកកម្ម</h2>
                <p>ទិដ្ឋភាពទូទៅនៃកំណត់ត្រាសំណើដែលបានរក្សាទុកក្នុងប្រព័ន្ធ។</p>
              </div>
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
                      <th>ឯកសារ PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardRows.map((row) => (
                      <tr key={row.requestId}>
                        <td>{row.program}</td>
                        <td>{row.location}</td>
                        <td>{row.participantCount}</td>
                        <td>{row.via}</td>
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
