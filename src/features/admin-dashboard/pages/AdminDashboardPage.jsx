import { useEffect, useMemo, useRef, useState } from "react";
import "../../report-form/styles/layout.css";
import "../../report-form/styles/request.css";
import "../../report-form/styles/form.css";
import "../../report-form/styles/responsive.css";
import "../../report-form/styles/pdf.css";
import "../styles/dashboard.css";
import "../../sys-manager/styles/sysmanager.css";
import {
  loadAdminMissionPanel,
  loadMissionHistory,
  loadArchivedHistory,
  sanitizeAdminMissionPanel,
  saveAdminMissionPanel,
  updateAdminMissionPanel,
  activateMissionPanel,
  archiveMissionPanel,
  restoreMissionPanel,
  deleteMissionFromHistory,
  syncPanelsFromApi,
} from "../../../utils/adminMissionPanel";
import {
  clearAdminMissionFile,
  createAdminMissionFileKey,
  loadAdminMissionFile,
  saveAdminMissionFile
} from "../../../utils/adminMissionFileStore";
import { DATA_MODE } from "../../../utils/dataMode";
import {
  createAdminPanel,
  updateAdminPanel,
  deleteAdminPanel,
  getAdminPanels,
  uploadAdminFile,
} from "../../../api/services";
import OfflineBanner from "../../../components/OfflineBanner";

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

const reportHistoryKey = "mcctv:mission-request-history";

function loadSubmissionCounts() {
  try {
    const raw = typeof window !== "undefined" && window.localStorage.getItem(reportHistoryKey);
    if (!raw) return {};
    const reports = JSON.parse(raw);
    if (!Array.isArray(reports)) return {};
    const counts = {};
    reports.forEach((r) => {
      const code = String(r?.adminPanel?.missionCode ?? "").trim();
      if (code) counts[code] = (counts[code] ?? 0) + 1;
    });
    return counts;
  } catch { return {}; }
}

function matchesHistorySearch(panel, query) {
  if (!query) return true;

  return [
    panel.missionCode,
    panel.missionTitle,
    panel.missionPlace,
    panel.missionTime,
    formatDateTime(panel.missionTime),
    panel.participantCount,
    panel.missionVia,
    panel.requestPlanFileName,
    panel.savedAt,
    formatDateTime(panel.savedAt)
  ].some((value) => String(value ?? "").toLowerCase().includes(query));
}

export default function AdminDashboardPage({ onBackToMain, onLogout }) {
  const [activePage, setActivePage] = useState("info");
  const [missionData, setMissionData] = useState(initialMissionData);
  const [savedPanel, setSavedPanel] = useState(() => loadAdminMissionPanel());
  const [missionHistory, setMissionHistory] = useState(() => loadMissionHistory());
  const [missionStatusText, setMissionStatusText] = useState("");
  const [historySearchText, setHistorySearchText] = useState("");
  const [remoteIdMap, setRemoteIdMap] = useState({});
  const [panelSyncError, setPanelSyncError] = useState("");
  const [fileViewPanel, setFileViewPanel] = useState(null);
  const [fileViewUrl, setFileViewUrl] = useState(null);
  const [fileViewLoading, setFileViewLoading] = useState(false);
  const [editingMissionCode, setEditingMissionCode] = useState(null);
  const [archivedHistory, setArchivedHistory] = useState(() => loadArchivedHistory());
  const [historySubPage, setHistorySubPage] = useState("active");
  const [historySortOrder, setHistorySortOrder] = useState("newest");
  const [submissionCounts, setSubmissionCounts] = useState(() => loadSubmissionCounts());
  const requestPlanFileInputRef = useRef(null);
  const requestPlanFileRef = useRef(null);
  const normalizedHistorySearch = historySearchText.trim().toLowerCase();
  const filteredMissionHistory = useMemo(() => {
    const filtered = missionHistory.filter((panel) => matchesHistorySearch(panel, normalizedHistorySearch));
    return [...filtered].sort((a, b) => {
      if (historySortOrder === "active") {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      }
      const tA = new Date(a.savedAt).getTime() || 0;
      const tB = new Date(b.savedAt).getTime() || 0;
      return historySortOrder === "oldest" ? tA - tB : tB - tA;
    });
  }, [missionHistory, normalizedHistorySearch, historySortOrder]);

  const filteredArchivedHistory = useMemo(
    () => archivedHistory.filter((panel) => matchesHistorySearch(panel, normalizedHistorySearch)),
    [archivedHistory, normalizedHistorySearch]
  );

  function refreshState() {
    setSavedPanel(loadAdminMissionPanel());
    setMissionHistory(loadMissionHistory());
    setArchivedHistory(loadArchivedHistory());
    setSubmissionCounts(loadSubmissionCounts());
  }

  useEffect(() => {
    const storedMissionPanel = loadAdminMissionPanel();
    if (storedMissionPanel) {
      setMissionData((current) => ({ ...current, ...storedMissionPanel }));
    }

    if (DATA_MODE === "local") return;

    getAdminPanels()
      .then((res) => {
        const panels = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
        if (panels.length === 0) return;

        const newMap = {};
        panels.forEach((p) => { if (p.missionCode && p.id) newMap[p.missionCode] = p.id; });
        setRemoteIdMap(newMap);

        syncPanelsFromApi(panels);
        refreshState();

        const active = panels.find((p) => p.isActive);
        if (active) {
          setMissionData((current) => ({
            ...current,
            missionTitle: active.missionTitle ?? current.missionTitle,
            missionPlace: active.missionPlace ?? current.missionPlace,
            missionTime: active.missionTime ?? current.missionTime,
            participantCount: active.participantCount != null
              ? String(active.participantCount)
              : current.participantCount,
            missionVia: active.missionVia ?? current.missionVia,
            requestPlanFileName: active.requestPlanFileName ?? current.requestPlanFileName,
          }));
        }
      })
      .catch(() => {});
  }, []);

  function handleMissionChange(event) {
    const { name, value } = event.target;
    setMissionData((current) => ({ ...current, [name]: value }));
    setMissionStatusText("");
  }

  async function handleRequestPlanFileChange(file) {
    if (!file) {
      await handleClearRequestPlanFile();
      requestPlanFileRef.current = null;
      return;
    }
    requestPlanFileRef.current = file;
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
      if (requestPlanFileInputRef.current) requestPlanFileInputRef.current.value = "";
    }
  }

  async function handleClearRequestPlanFile() {
    const savedMissionPanel = loadAdminMissionPanel();
    const savedFileKey = savedMissionPanel?.requestPlanFileKey || "";
    const currentFileKey = missionData.requestPlanFileKey;
    if (currentFileKey && currentFileKey !== savedFileKey) {
      try { await clearAdminMissionFile(currentFileKey); } catch (error) { console.error(error); }
    }
    setMissionData((current) => ({
      ...current,
      requestPlanFileName: "",
      requestPlanFileDataUrl: "",
      requestPlanFileKey: "",
      requestPlanFileType: ""
    }));
    setMissionStatusText("");
    if (requestPlanFileInputRef.current) requestPlanFileInputRef.current.value = "";
  }

  async function handleCreateMissionPanel() {
    if (editingMissionCode) {
      // ── UPDATE existing panel ──────────────────────────────────────
      const updated = updateAdminMissionPanel(editingMissionCode, missionData);
      if (!updated) {
        setMissionStatusText("សូមបំពេញព័ត៌មានបេសកកម្មមុនពេលរក្សាទុក។");
        return;
      }
      refreshState();
      setEditingMissionCode(null);
      setMissionStatusText(`បានរក្សាទុកដោយជោគជ័យ — ${updated.missionCode}`);

      if (DATA_MODE !== "local") {
        const remoteId = remoteIdMap[updated.missionCode];
        if (remoteId) {
          const panelPayload = {
            missionTitle: missionData.missionTitle,
            missionPlace: missionData.missionPlace,
            missionTime: missionData.missionTime,
            participantCount: missionData.participantCount ? Number(missionData.participantCount) : null,
            missionVia: missionData.missionVia,
          };
          updateAdminPanel(remoteId, panelPayload).catch(() => {
            setPanelSyncError("ការបញ្ជូនទៅ Server បរាជ័យ — ទិន្នន័យបានរក្សាទុកក្នុងឧបករណ៍");
          });
        }
      }
      return;
    }

    // ── CREATE new panel ────────────────────────────────────────────
    const created = saveAdminMissionPanel(missionData);
    if (!created) {
      setMissionStatusText(
        sanitizeAdminMissionPanel(missionData)
          ? "មិនអាចរក្សាទុកឯកសារនេះបានទេ។ សូមសាកល្បងឯកសារដែលមានទំហំតូចជាងនេះ។"
          : "សូមបំពេញព័ត៌មានបេសកកម្មមុនពេលបង្កើត។"
      );
      return;
    }
    refreshState();
    setMissionStatusText(`បានបង្កើតដោយជោគជ័យ — លេខបេសកកម្ម: ${created.missionCode}`);

    if (DATA_MODE === "local") return;

    const existingRemoteId = remoteIdMap[created.missionCode];
    const panelPayload = {
      missionCode: created.missionCode,
      missionTitle: missionData.missionTitle,
      missionPlace: missionData.missionPlace,
      missionTime: missionData.missionTime,
      participantCount: missionData.participantCount ? Number(missionData.participantCount) : null,
      missionVia: missionData.missionVia,
    };

    try {
      const res = existingRemoteId
        ? await updateAdminPanel(existingRemoteId, panelPayload)
        : await createAdminPanel(panelPayload);
      const remoteId = res.data?.id;
      if (remoteId) {
        setRemoteIdMap((prev) => ({ ...prev, [created.missionCode]: remoteId }));
        if (requestPlanFileRef.current) {
          uploadAdminFile(remoteId, requestPlanFileRef.current).catch(() => {});
        }
      }
    } catch {
      setPanelSyncError("ការបញ្ជូនទៅ Server បរាជ័យ — ទិន្នន័យបានរក្សាទុកក្នុងឧបករណ៍");
    }
  }

  async function handleClearMissionPanel() {
    const currentFileKey = missionData.requestPlanFileKey;
    setMissionData(initialMissionData);
    if (requestPlanFileInputRef.current) requestPlanFileInputRef.current.value = "";
    if (currentFileKey) {
      const savedMissionPanel = loadAdminMissionPanel();
      const savedFileKey = savedMissionPanel?.requestPlanFileKey || "";
      if (currentFileKey !== savedFileKey) {
        try { await clearAdminMissionFile(currentFileKey); } catch (error) { console.error(error); }
      }
    }
    setMissionStatusText("បានសម្អាតសំណុំបែបបទ។");
  }

  function handleEditMission(panel) {
    setMissionData({
      missionTitle: panel.missionTitle ?? "",
      missionPlace: panel.missionPlace ?? "",
      missionTime: panel.missionTime ?? "",
      participantCount: panel.participantCount ?? "",
      missionVia: panel.missionVia ?? "",
      requestPlanFileName: panel.requestPlanFileName ?? "",
      requestPlanFileDataUrl: panel.requestPlanFileDataUrl ?? "",
      requestPlanFileKey: panel.requestPlanFileKey ?? "",
      requestPlanFileType: panel.requestPlanFileType ?? "",
    });
    setEditingMissionCode(panel.missionCode);
    setMissionStatusText("");
    setActivePage("info");
  }

  function handleCancelEdit() {
    setEditingMissionCode(null);
    setMissionData(initialMissionData);
    setMissionStatusText("");
    if (requestPlanFileInputRef.current) requestPlanFileInputRef.current.value = "";
  }

  function handleArchiveMission(missionCode) {
    archiveMissionPanel(missionCode);
    refreshState();
    setMissionStatusText("");
  }

  function handleRestoreMission(missionCode) {
    restoreMissionPanel(missionCode);
    refreshState();
  }

  function handleActivateMission(missionCode) {
    activateMissionPanel(missionCode);
    refreshState();
    const activated = loadAdminMissionPanel();
    if (activated) setMissionData((current) => ({ ...current, ...activated }));
    setMissionStatusText(`បានដំណើរការ — ${missionCode}`);
  }

  async function openFileView(panel) {
    if (!panel.requestPlanFileKey) return;
    setFileViewPanel(panel);
    setFileViewUrl(null);
    setFileViewLoading(true);
    try {
      const blob = await loadAdminMissionFile(panel.requestPlanFileKey);
      if (blob) setFileViewUrl(URL.createObjectURL(blob));
    } catch {
      // show empty state
    } finally {
      setFileViewLoading(false);
    }
  }

  function closeFileView() {
    if (fileViewUrl) URL.revokeObjectURL(fileViewUrl);
    setFileViewPanel(null);
    setFileViewUrl(null);
  }

  async function handleDeleteHistoryMission(missionCode, fileKey) {
    deleteMissionFromHistory(missionCode);
    if (fileKey) {
      try { await clearAdminMissionFile(fileKey); } catch (error) { console.error(error); }
    }
    if (DATA_MODE !== "local") {
      const remoteId = remoteIdMap[missionCode];
      if (remoteId) {
        deleteAdminPanel(remoteId).catch(() => {});
        setRemoteIdMap((prev) => { const next = { ...prev }; delete next[missionCode]; return next; });
      }
    }
    refreshState();
    setMissionStatusText("");
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
          <div className="sys-sidebar-section-label">ការគ្រប់គ្រង</div>
          <nav className="sys-manager-nav">
            <button
              type="button"
              className={`sys-nav-item${activePage === "info" ? " active" : ""}`}
              onClick={() => setActivePage("info")}
            >
              ព័ត៌មានកម្មវិធី
            </button>
            <button
              type="button"
              className={`sys-nav-item${activePage === "history" && historySubPage === "active" ? " active" : ""}`}
              onClick={() => { setActivePage("history"); setHistorySubPage("active"); }}
            >
              ប្រវត្តិបេសកកម្ម
              {missionHistory.length > 0 && (
                <span className="sys-nav-badge">{missionHistory.length}</span>
              )}
            </button>
            <button
              type="button"
              className={`sys-nav-item sys-nav-item--sub${activePage === "history" && historySubPage === "archived" ? " active" : ""}`}
              onClick={() => { setActivePage("history"); setHistorySubPage("archived"); }}
            >
              ប័ណ្ណស័រ
              {archivedHistory.length > 0 && (
                <span className="sys-nav-badge">{archivedHistory.length}</span>
              )}
            </button>
          </nav>
        </aside>

        <main className="sys-manager-main">
          <OfflineBanner />

          {/* ── Page: ព័ត៌មានកម្មវិធី ── */}
          {activePage === "info" && (
            <>
              <div className="sys-manager-content-header">
                <h2 className="sys-manager-content-title">ព័ត៌មានកម្មវិធី</h2>
                {savedPanel?.savedAt && (
                  <span style={{ fontSize: 13, color: "#9a7840" }}>
                    រក្សាទុកចុងក្រោយ: {formatDateTime(savedPanel.savedAt)}
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "20px", alignItems: "start" }}>
                <section className="phase-card phase-mission admin-mission-card">
                  <div className="phase-header admin-mission-main-header">
                    <h3>ព័ត៌មានកម្មវិធី</h3>
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
                      <span>ទំហំអ្នកចូលរួម</span>
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
                  {editingMissionCode && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                      borderRadius: 10, background: "rgba(199,134,18,0.1)",
                      border: "1px solid rgba(199,134,18,0.35)", marginBottom: 8
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#5c3506" }}>
                        ✏ កំពុងកែប្រែ — {editingMissionCode}
                      </span>
                      <button className="ghost" type="button" style={{ fontSize: 12, padding: "3px 10px", marginLeft: "auto" }} onClick={handleCancelEdit}>
                        បោះបង់
                      </button>
                    </div>
                  )}
                  <div className="actions">
                    <button className="primary" type="button" onClick={handleCreateMissionPanel}>
                      {editingMissionCode ? "រក្សាទុក" : "បង្កើត"}
                    </button>
                    {!editingMissionCode && (
                      <button className="ghost" type="button" onClick={handleClearMissionPanel}>
                        សម្អាត
                      </button>
                    )}
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
                      {savedPanel.missionCode && (
                        <div className="sys-panel-dl-row sys-panel-dl-row--meta">
                          <dt>លេខបេសកកម្ម</dt>
                          <dd>{savedPanel.missionCode}</dd>
                        </div>
                      )}
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
            </>
          )}

          {/* ── Page: ប្រវត្តិបេសកកម្ម ── */}
          {activePage === “history” && historySubPage === “active” && (
            <>
              <div className=”sys-manager-content-header admin-history-header”>
                <div>
                  <h2 className=”sys-manager-content-title”>ប្រវត្តិបេសកកម្ម</h2>
                  <span className=”admin-history-count”>
                    {normalizedHistorySearch
                      ? `${filteredMissionHistory.length} / ${missionHistory.length} កំណត់ត្រា`
                      : `${missionHistory.length} កំណត់ត្រា`}
                  </span>
                </div>
                <div style={{ display: “flex”, gap: 8, alignItems: “center”, flexWrap: “wrap” }}>
                  <select
                    className=”admin-history-sort”
                    value={historySortOrder}
                    onChange={(e) => setHistorySortOrder(e.target.value)}
                    aria-label=”តម្រៀបប្រវត្តិ”
                  >
                    <option value=”newest”>ថ្មីជាងគេ</option>
                    <option value=”oldest”>ចាស់ជាងគេ</option>
                    <option value=”active”>កំពុងប្រើដំបូង</option>
                  </select>
                  {missionHistory.length > 0 && (
                    <div className=”admin-history-search-wrap”>
                      <span className=”admin-history-search-icon” aria-hidden=”true”>⌕</span>
                      <input
                        className=”admin-history-search”
                        type=”search”
                        value={historySearchText}
                        onChange={(event) => setHistorySearchText(event.target.value)}
                        placeholder=”ស្វែងរកលេខកូដ កម្មវិធី ទីតាំង...”
                        aria-label=”ស្វែងរកប្រវត្តិបេសកកម្ម”
                      />
                    </div>
                  )}
                </div>
              </div>

              {missionHistory.length === 0 ? (
                <p className=”sys-table-empty”>មិនទាន់មានប្រវត្តិបេសកកម្មទេ។</p>
              ) : filteredMissionHistory.length === 0 ? (
                <p className=”sys-table-empty”>មិនមានលទ្ធផលស្វែងរកសម្រាប់ “{historySearchText.trim()}” ទេ។</p>
              ) : (
                <div className=”admin-history-list”>
                  {filteredMissionHistory.map((panel) => {
                    const subCount = submissionCounts[panel.missionCode] ?? 0;
                    return (
                      <div
                        key={panel.missionCode}
                        className={`admin-history-card${panel.isActive ? “ active” : “”}`}
                      >
                        <span className=”admin-history-code”>
                          {panel.missionCode}
                        </span>
                        <div className=”admin-history-main”>
                          <div className=”admin-history-title”>
                            {panel.missionTitle || “—“}
                            {subCount > 0 && (
                              <span className=”admin-submission-badge”>{subCount} សំណើ</span>
                            )}
                          </div>
                          <div className=”admin-history-meta”>
                            {[panel.missionPlace, formatDateTime(panel.missionTime), formatDateTime(panel.savedAt)]
                              .filter(Boolean)
                              .join(“ · “)}
                          </div>
                          <div className=”admin-history-detail-row”>
                            {panel.participantCount ? <span>{panel.participantCount} នាក់</span> : null}
                            {panel.missionVia ? <span>តាមរយៈ: {panel.missionVia}</span> : null}
                            {panel.requestPlanFileName ? <span>{panel.requestPlanFileName}</span> : null}
                          </div>
                        </div>
                        {panel.requestPlanFileKey ? (
                          <button
                            type=”button”
                            className=”ghost”
                            style={{ fontSize: 13, padding: “5px 12px”, flexShrink: 0 }}
                            onClick={() => openFileView(panel)}
                          >
                            មើលឯកសារ
                          </button>
                        ) : null}
                        <button
                          type=”button”
                          className=”ghost”
                          style={{ fontSize: 13, padding: “5px 12px”, flexShrink: 0 }}
                          onClick={() => handleEditMission(panel)}
                        >
                          កែប្រែ
                        </button>
                        {panel.isActive ? (
                          <span className=”admin-history-active”>
                            ● កំពុងប្រើ
                          </span>
                        ) : (
                          <button
                            type=”button”
                            className=”ghost”
                            style={{ fontSize: 13, padding: “5px 12px”, flexShrink: 0 }}
                            onClick={() => handleActivateMission(panel.missionCode)}
                          >
                            ដំណើរការ
                          </button>
                        )}
                        <button
                          type=”button”
                          className=”ghost”
                          style={{ fontSize: 13, padding: “5px 12px”, color: “#92650a”, flexShrink: 0 }}
                          onClick={() => handleArchiveMission(panel.missionCode)}
                        >
                          ប័ណ្ណស័រ
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Sub-page: ប័ណ្ណស័រ ── */}
          {activePage === “history” && historySubPage === “archived” && (
            <>
              <div className=”sys-manager-content-header admin-history-header”>
                <div>
                  <h2 className=”sys-manager-content-title”>ប័ណ្ណស័រ</h2>
                  <span className=”admin-history-count”>{archivedHistory.length} កំណត់ត្រា</span>
                </div>
                {archivedHistory.length > 0 && (
                  <div className=”admin-history-search-wrap”>
                    <span className=”admin-history-search-icon” aria-hidden=”true”>⌕</span>
                    <input
                      className=”admin-history-search”
                      type=”search”
                      value={historySearchText}
                      onChange={(event) => setHistorySearchText(event.target.value)}
                      placeholder=”ស្វែងរកលេខកូដ កម្មវិធី ទីតាំង...”
                      aria-label=”ស្វែងរកប័ណ្ណស័រ”
                    />
                  </div>
                )}
              </div>

              {archivedHistory.length === 0 ? (
                <p className=”sys-table-empty”>ប័ណ្ណស័រទទេ — បេសកកម្មដែលបានដាក់ប័ណ្ណស័រនឹងបង្ហាញនៅទីនេះ។</p>
              ) : filteredArchivedHistory.length === 0 ? (
                <p className=”sys-table-empty”>មិនមានលទ្ធផលស្វែងរកសម្រាប់ “{historySearchText.trim()}” ទេ។</p>
              ) : (
                <div className=”admin-history-list”>
                  {filteredArchivedHistory.map((panel) => (
                    <div key={panel.missionCode} className=”admin-history-card admin-history-card--archived”>
                      <span className=”admin-history-code”>{panel.missionCode}</span>
                      <div className=”admin-history-main”>
                        <div className=”admin-history-title”>{panel.missionTitle || “—“}</div>
                        <div className=”admin-history-meta”>
                          {[panel.missionPlace, formatDateTime(panel.missionTime), formatDateTime(panel.savedAt)]
                            .filter(Boolean)
                            .join(“ · “)}
                        </div>
                        <div className=”admin-history-detail-row”>
                          {panel.participantCount ? <span>{panel.participantCount} នាក់</span> : null}
                          {panel.missionVia ? <span>តាមរយៈ: {panel.missionVia}</span> : null}
                        </div>
                      </div>
                      {panel.requestPlanFileKey ? (
                        <button
                          type=”button”
                          className=”ghost”
                          style={{ fontSize: 13, padding: “5px 12px”, flexShrink: 0 }}
                          onClick={() => openFileView(panel)}
                        >
                          មើលឯកសារ
                        </button>
                      ) : null}
                      <button
                        type=”button”
                        className=”ghost”
                        style={{ fontSize: 13, padding: “5px 12px”, flexShrink: 0 }}
                        onClick={() => handleRestoreMission(panel.missionCode)}
                      >
                        ស្ដារ
                      </button>
                      <button
                        type=”button”
                        className=”ghost”
                        style={{ fontSize: 13, padding: “5px 12px”, color: “#b3261e”, flexShrink: 0 }}
                        onClick={() => handleDeleteHistoryMission(panel.missionCode, panel.requestPlanFileKey)}
                      >
                        លុបថេរ
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </main>
      </div>

      {fileViewPanel ? (
        <div
          className="sys-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="adminFileViewTitle"
          onClick={closeFileView}
        >
          <div className="sys-modal-card superadmin-image-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sys-modal-header">
              <div>
                <h3 id="adminFileViewTitle">ឯកសារបេសកកម្ម</h3>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#7a6846" }}>
                  {fileViewPanel.missionCode} · {fileViewPanel.missionTitle || "—"}
                </p>
              </div>
              <button type="button" className="ghost" onClick={closeFileView}>បិទ</button>
            </div>
            <div className="sys-modal-body">
              {fileViewLoading ? (
                <p style={{ textAlign: "center", color: "#7a6846", padding: "32px 0" }}>កំពុងផ្ទុក...</p>
              ) : !fileViewUrl ? (
                <p style={{ textAlign: "center", color: "#7a6846", padding: "32px 0" }}>មិនអាចផ្ទុកឯកសារបានទេ</p>
              ) : fileViewPanel.requestPlanFileType === "application/pdf" || fileViewPanel.requestPlanFileName?.toLowerCase().endsWith(".pdf") ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <p style={{ marginBottom: 12, color: "#5c3506", fontWeight: 600 }}>
                    📄 {fileViewPanel.requestPlanFileName}
                  </p>
                  <a
                    href={fileViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="primary"
                    style={{ display: "inline-block", padding: "10px 24px", borderRadius: 10, textDecoration: "none" }}
                  >
                    បើក PDF
                  </a>
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <p style={{ marginBottom: 12, color: "#5c3506", fontWeight: 600 }}>
                    {fileViewPanel.requestPlanFileName}
                  </p>
                  <a href={fileViewUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={fileViewUrl}
                      alt={fileViewPanel.requestPlanFileName}
                      style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: 10, border: "1px solid rgba(92,53,6,0.18)" }}
                    />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {panelSyncError && (
        <div role="alert" style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 200,
          background: "#fef2f2", border: "1px solid #fca5a5",
          borderRadius: 8, padding: "12px 16px", color: "#991b1b",
          fontSize: 13, maxWidth: 320, display: "flex", alignItems: "center", gap: 12
        }}>
          <span>⚠ {panelSyncError}</span>
          <button
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b", padding: 0, fontSize: 16 }}
            onClick={() => setPanelSyncError("")}
          >✕</button>
        </div>
      )}
    </div>
  );
}
