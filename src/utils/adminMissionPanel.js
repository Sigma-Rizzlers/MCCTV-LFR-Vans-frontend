const adminMissionPanelKey = "mcctv:admin-mission-panel";

function toText(value) {
  return String(value ?? "").trim();
}

export function sanitizeAdminMissionPanel(rawPanel) {
  if (!rawPanel || typeof rawPanel !== "object") {
    return null;
  }

  const missionTitle = toText(rawPanel.missionTitle);
  const missionPlace = toText(rawPanel.missionPlace);
  const participantCount = toText(rawPanel.participantCount);
  const mission = toText(rawPanel.mission);

  if (!missionTitle && !missionPlace && !participantCount && !mission) {
    return null;
  }

  return {
    missionTitle,
    missionPlace,
    participantCount,
    mission
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
    return null;
  }

  try {
    window.localStorage.setItem(adminMissionPanelKey, JSON.stringify(sanitizedPanel));
    return sanitizedPanel;
  } catch (error) {
    console.error(error);
    return null;
  }
}
