const adminMissionPanelKey = "mcctv:admin-mission-panel";
const adminMissionPanelUpdatedEvent = "mcctv:admin-mission-panel-updated";

function toText(value) {
  return String(value ?? "").trim();
}

function emitAdminMissionPanelUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(adminMissionPanelUpdatedEvent));
}

export function sanitizeAdminMissionPanel(rawPanel) {
  if (!rawPanel || typeof rawPanel !== "object") {
    return null;
  }

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
    !missionTitle &&
    !missionPlace &&
    !missionTime &&
    !participantCount &&
    !missionVia &&
    !requestPlanFileName &&
    !requestPlanFileDataUrl &&
    !requestPlanFileKey
  ) {
    return null;
  }

  return {
    missionTitle,
    missionPlace,
    missionTime,
    participantCount,
    missionVia,
    requestPlanFileName,
    requestPlanFileDataUrl,
    requestPlanFileKey,
    requestPlanFileType
  };
}

export function loadAdminMissionPanel() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(adminMissionPanelKey);
    if (!rawValue) {
      return null;
    }

    return sanitizeAdminMissionPanel(JSON.parse(rawValue));
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function saveAdminMissionPanel(rawPanel) {
  if (typeof window === "undefined") {
    return null;
  }

  const sanitizedPanel = sanitizeAdminMissionPanel(rawPanel);
  if (!sanitizedPanel) {
    window.localStorage.removeItem(adminMissionPanelKey);
    emitAdminMissionPanelUpdated();
    return null;
  }

  try {
    window.localStorage.setItem(adminMissionPanelKey, JSON.stringify(sanitizedPanel));
    emitAdminMissionPanelUpdated();
    return sanitizedPanel;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function subscribeAdminMissionPanel(listener) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => {
    listener(loadAdminMissionPanel());
  };

  const handleStorage = (event) => {
    if (event.key && event.key !== adminMissionPanelKey) {
      return;
    }

    handleChange();
  };

  window.addEventListener(adminMissionPanelUpdatedEvent, handleChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(adminMissionPanelUpdatedEvent, handleChange);
    window.removeEventListener("storage", handleStorage);
  };
}
