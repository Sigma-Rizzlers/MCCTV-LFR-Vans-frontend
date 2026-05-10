import { useEffect, useRef, useState } from "react";
import "../../report-form/styles/layout.css";
import "../../report-form/styles/request.css";
import "../../report-form/styles/form.css";
import "../../report-form/styles/responsive.css";
import "../../report-form/styles/pdf.css";
import "../styles/dashboard.css";
import "../../sys-manager/styles/sysmanager.css";
import { loadAdminMissionPanel, sanitizeAdminMissionPanel, saveAdminMissionPanel } from "../../../utils/adminMissionPanel";
import {
  clearAdminMissionFile,
  createAdminMissionFileKey,
  saveAdminMissionFile
} from "../../../utils/adminMissionFileStore";

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

function formatDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("km-KH", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  }).format(date);
}

export default function AdminDashboardPage({ onBackToMain, onLogout }) {
  const [missionData, setMissionData] = useState(initialMissionData);
  const [savedPanel, setSavedPanel] = useState(() => loadAdminMissionPanel());
  const [missionStatusText, setMissionStatusText] = useState("");
  const requestPlanFileInputRef = useRef(null);

  useEffect(() => {
    const storedMissionPanel = loadAdminMissionPanel();
    if (!storedMissionPanel) return;
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

    setSavedPanel(loadAdminMissionPanel());
    setMissionStatusText("បានបង្កើតដោយជោគជ័យ។ ព័ត៌មានបេសកកម្មនៅទំព័រដើមត្រូវបានអាប់ដេត។");
  }

  async function handleClearMissionPanel() {
    const savedMissionPanel = loadAdminMissionPanel();
    const fileKeys = new Set(
      [savedMissionPanel?.requestPlanFileKey, missionData.requestPlanFileKey].filter(Boolean)
    );

    setMissionData(initialMissionData);
    saveAdminMissionPanel(null);
    setSavedPanel(null);

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
    <div className="sys-manager-page notranslate" translate="no" lang="km">
      <header className="sys-manager-topbar">
        <div className="sys-manager-brand">
          <img
            className="sys-manager-logo"
            src="/about-moi-logo.png"
            alt="Ministry of Interior logo"
            onError={(e) => { e.currentTarget.src = "/logo.png"; }}
          />
          <div>
            <div className="sys-manager-brand-title">ផ្ទាំងគ្រប់គ្រងអ្នកគ្រប់គ្រង</div>
            <div className="sys-manager-brand-sub">Admin Dashboard</div>
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
          <div className="sys-sidebar-section-label">ការគ្រប់គ្រង</div>
          <nav className="sys-manager-nav">
            <button type="button" className="sys-nav-item active">ពត៌មានកម្មវិធី</button>
          </nav>
        </aside>

        <main className="sys-manager-main">
          <div className="sys-manager-content-header">
            <h2 className="sys-manager-content-title">ពត៌មានកម្មវិធី</h2>
            {savedPanel?.savedAt && (
              <span style={{ fontSize: 13, color: "#9a7840" }}>
                រក្សាទុកចុងក្រោយ: {formatDateTime(savedPanel.savedAt)}
              </span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "20px", alignItems: "start" }}>
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
                    type="datetime-local"
                    name="missionTime"
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
              <div className="phase-header admin-mission-upload-header" style={{ marginTop: "16px" }}>
                <h3>ឯកសារស្នើសុំផែនការ កំលាំង និងសម្ភារៈបច្ចេកទេស</h3>
              </div>
              <div className="upload-block admin-mission-upload-block">
                <label className="upload-area" htmlFor="requestPlanFile">
                  <span className="upload-icon" aria-hidden="true">↑</span>
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

            {/* Preview panel */}
            <div className="sys-overview-panel" style={{ position: "sticky", top: "20px" }}>
              <h3 className="sys-panel-title">ព័ត៌មានដែលបានរក្សាទុក</h3>
              {!savedPanel ? (
                <p className="sys-reports-empty" style={{ padding: "16px 18px" }}>
                  មិនទាន់មានទិន្នន័យ — សូមបំពេញហើយចុច «បង្កើត»
                </p>
              ) : (
                <dl className="sys-panel-dl">
                  {savedPanel.savedAt && (
                    <div className="sys-panel-dl-row sys-panel-dl-row--meta">
                      <dt>រក្សាទុកនៅ</dt>
                      <dd>{formatDateTime(savedPanel.savedAt)}</dd>
                    </div>
                  )}
                  {savedPanel.missionTitle && (
                    <div className="sys-panel-dl-row">
                      <dt>កម្មវិធី</dt>
                      <dd>{savedPanel.missionTitle}</dd>
                    </div>
                  )}
                  {savedPanel.missionPlace && (
                    <div className="sys-panel-dl-row">
                      <dt>ទីតាំង</dt>
                      <dd>{savedPanel.missionPlace}</dd>
                    </div>
                  )}
                  {savedPanel.missionTime && (
                    <div className="sys-panel-dl-row">
                      <dt>ពេលវេលា</dt>
                      <dd>{formatDateTime(savedPanel.missionTime)}</dd>
                    </div>
                  )}
                  {savedPanel.participantCount && (
                    <div className="sys-panel-dl-row">
                      <dt>អ្នកចូលរួម</dt>
                      <dd>{savedPanel.participantCount} នាក់</dd>
                    </div>
                  )}
                  {savedPanel.missionVia && (
                    <div className="sys-panel-dl-row">
                      <dt>តាមរយៈ</dt>
                      <dd>{savedPanel.missionVia}</dd>
                    </div>
                  )}
                  {savedPanel.requestPlanFileName && (
                    <div className="sys-panel-dl-row">
                      <dt>ឯកសារ</dt>
                      <dd>{savedPanel.requestPlanFileName}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
