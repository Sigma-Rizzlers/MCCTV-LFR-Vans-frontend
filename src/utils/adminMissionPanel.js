const adminMissionPanelKey = "mcctv:admin-mission-panel";
const adminMissionHistoryKey = "mcctv:mission-panel-history";
const adminMissionPanelUpdatedEvent = "mcctv:admin-mission-panel-updated";

function toText(value) {
  return String(value ?? "").trim();
}

function emitAdminMissionPanelUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(adminMissionPanelUpdatedEvent));
}

function generateMissionCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MSN-${y}${m}${d}-${rand}`;
}

export function sanitizeAdminMissionPanel(rawPanel) {
  if (!rawPanel || typeof rawPanel !== "object") return null;

  const missionTitle = toText(rawPanel.missionTitle);
  const missionPlace = toText(rawPanel.missionPlace);
  const missionTime = toText(
    rawPanel.missionTime ||
      [rawPanel.departureDate, rawPanel.returnDate].map(toText).filter(Boolean).join(" - ")
  );
  const participantCount = toText(rawPanel.participantCount);
  const missionVia = toText(rawPanel.missionVia || rawPanel.mission);
  const requestPlanFileName = toText(rawPanel.requestPlanFileName);
  const requestPlanFileDataUrl = toText(rawPanel.requestPlanFileDataUrl);
  const requestPlanFileKey = toText(rawPanel.requestPlanFileKey);
  const requestPlanFileType = toText(rawPanel.requestPlanFileType);

  if (
    !missionTitle && !missionPlace && !missionTime && !participantCount &&
    !missionVia && !requestPlanFileName && !requestPlanFileDataUrl && !requestPlanFileKey
  ) {
    return null;
  }

  return {
    missionTitle, missionPlace, missionTime, participantCount, missionVia,
    requestPlanFileName, requestPlanFileDataUrl, requestPlanFileKey, requestPlanFileType
  };
}

function loadHistoryRaw() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(adminMissionHistoryKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((p) => p && p.missionCode);
      }
    }
    // Migration: seed history from old single-panel key if no history yet
    const oldRaw = window.localStorage.getItem(adminMissionPanelKey);
    if (!oldRaw) return [];
    const oldPanel = JSON.parse(oldRaw);
    if (!oldPanel || typeof oldPanel !== "object") return [];
    const migrated = [{
      ...oldPanel,
      missionCode: oldPanel.missionCode || generateMissionCode(),
      savedAt: oldPanel.savedAt || new Date().toISOString(),
      isActive: true,
    }];
    window.localStorage.setItem(adminMissionHistoryKey, JSON.stringify(migrated));
    return migrated;
  } catch {
    return [];
  }
}

function writeHistory(history) {
  window.localStorage.setItem(adminMissionHistoryKey, JSON.stringify(history));
  const active = history.find((p) => p.isActive) ?? null;
  if (active) {
    window.localStorage.setItem(adminMissionPanelKey, JSON.stringify(active));
  } else {
    window.localStorage.removeItem(adminMissionPanelKey);
  }
  emitAdminMissionPanelUpdated();
}

export function loadMissionHistory() {
  return loadHistoryRaw();
}

export function loadAdminMissionPanel() {
  if (typeof window === "undefined") return null;
  try {
    const history = loadHistoryRaw();
    if (history.length > 0) {
      return history.find((p) => p.isActive) ?? null;
    }
    // fallback for data saved before history was introduced
    const rawValue = window.localStorage.getItem(adminMissionPanelKey);
    if (!rawValue) return null;
    return sanitizeAdminMissionPanel(JSON.parse(rawValue));
  } catch {
    return null;
  }
}

export function saveAdminMissionPanel(rawPanel) {
  if (typeof window === "undefined") return null;

  const sanitizedPanel = sanitizeAdminMissionPanel(rawPanel);
  if (!sanitizedPanel) {
    const history = loadHistoryRaw().map((p) => ({ ...p, isActive: false }));
    writeHistory(history);
    return null;
  }

  const missionCode = generateMissionCode();
  const entry = {
    ...sanitizedPanel,
    missionCode,
    savedAt: new Date().toISOString(),
    isActive: true,
  };

  try {
    const history = loadHistoryRaw().map((p) => ({ ...p, isActive: false }));
    history.unshift(entry);
    writeHistory(history);
    return entry;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function activateMissionPanel(missionCode) {
  const history = loadHistoryRaw().map((p) => ({ ...p, isActive: p.missionCode === missionCode }));
  writeHistory(history);
  return history.find((p) => p.isActive) ?? null;
}

export function deleteMissionFromHistory(missionCode) {
  const history = loadHistoryRaw().filter((p) => p.missionCode !== missionCode);
  writeHistory(history);
}

export function syncPanelsFromApi(apiPanels) {
  if (typeof window === "undefined" || !Array.isArray(apiPanels) || apiPanels.length === 0) return;
  const mapped = apiPanels.map((p) => ({
    missionCode: toText(p.missionCode) || toText(String(p.id ?? "")),
    missionTitle: toText(p.missionTitle),
    missionPlace: toText(p.missionPlace),
    missionTime: toText(p.missionTime),
    participantCount: toText(p.participantCount),
    missionVia: toText(p.missionVia),
    requestPlanFileName: toText(p.requestPlanFileName),
    requestPlanFileDataUrl: "",
    requestPlanFileKey: "",
    requestPlanFileType: "",
    savedAt: toText(p.createdAt || p.savedAt),
    isActive: Boolean(p.isActive),
  })).filter((p) => p.missionCode);
  if (mapped.length > 0) writeHistory(mapped);
}

export function subscribeAdminMissionPanel(listener) {
  if (typeof window === "undefined") return () => {};

  const handleChange = () => { listener(loadAdminMissionPanel()); };
  const handleStorage = (event) => {
    if (event.key && event.key !== adminMissionPanelKey && event.key !== adminMissionHistoryKey) return;
    handleChange();
  };

  window.addEventListener(adminMissionPanelUpdatedEvent, handleChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(adminMissionPanelUpdatedEvent, handleChange);
    window.removeEventListener("storage", handleStorage);
  };
}
