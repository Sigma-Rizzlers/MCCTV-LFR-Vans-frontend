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

export function updateAdminMissionPanel(missionCode, rawPanel) {
  if (typeof window === "undefined" || !missionCode) return null;
  const sanitized = sanitizeAdminMissionPanel(rawPanel);
  if (!sanitized) return null;
  const history = loadHistoryRaw();
  const index = history.findIndex((p) => p.missionCode === missionCode);
  if (index === -1) return null;
  const updated = {
    ...history[index],
    ...sanitized,
    missionCode,
    savedAt: new Date().toISOString(),
  };
  history[index] = updated;
  writeHistory(history);
  return updated;
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

const reportHistoryKey = "mcctv:mission-request-history";

/**
 * One-time migration: for any report in localStorage that is missing
 * adminPanel.missionCode, look up the panel history and fill it in
 * by matching missionTitle + missionTime.
 * Returns the number of reports that were updated.
 */
export function backfillMissionCodes() {
  if (typeof window === "undefined") return 0;
  try {
    const panels = loadHistoryRaw();
    if (panels.length === 0) return 0;

    const raw = window.localStorage.getItem(reportHistoryKey);
    if (!raw) return 0;
    const reports = JSON.parse(raw);
    if (!Array.isArray(reports) || reports.length === 0) return 0;

    let patched = 0;
    const updated = reports.map((report) => {
      if (!report || typeof report !== "object") return report;
      if (toText(report.adminPanel?.missionCode)) return report; // already filled

      const missionTitle = toText(report.adminPanel?.missionTitle || report.formData?.missionTitle || "");
      const missionTime  = toText(report.adminPanel?.missionTime  || "");
      if (!missionTitle && !missionTime) return report;

      const match = panels.find(
        (p) => toText(p.missionTitle) === missionTitle && toText(p.missionTime) === missionTime
      );
      if (match?.missionCode) {
        patched += 1;
        return {
          ...report,
          adminPanel: { ...(report.adminPanel || {}), missionCode: match.missionCode },
        };
      }
      return report;
    });

    if (patched > 0) {
      window.localStorage.setItem(reportHistoryKey, JSON.stringify(updated));
    }
    return patched;
  } catch {
    return 0;
  }
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
