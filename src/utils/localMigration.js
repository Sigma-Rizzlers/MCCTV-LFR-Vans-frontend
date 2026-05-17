import {
  createVanRequest,
  uploadReportFile,
  createAdminPanel,
  uploadAdminFile,
  createUser,
} from "../api/services";
import { loadReportFiles, REPORT_FILE_FIELDS } from "./reportFileStore";
import { loadAdminMissionFile } from "./adminMissionFileStore";

const LOCAL_KEY = "mcctv:mission-request-history";
const ACCOUNTS_KEY = "mcctv:accounts";
const ADMIN_HISTORY_KEY = "mcctv:mission-panel-history";

function readLocalReports() {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeLocalReports(reports) {
  try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(reports)); } catch {}
}

function readLocalAccounts() {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function readAdminPanelHistory() {
  try {
    const raw = window.localStorage.getItem(ADMIN_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p) => p?.missionCode) : [];
  } catch { return []; }
}

function writeAdminPanelHistory(history) {
  try { window.localStorage.setItem(ADMIN_HISTORY_KEY, JSON.stringify(history)); } catch {}
}

const slotToField = {
  support: "supportFileName",
  lodging: "lodgingImageName",
  breakfast: "breakfastImageName",
  lunch: "lunchImageName",
  dinner: "dinnerImageName",
  implementation: "implementationImageName",
};

export async function migrateToBackend(onProgress = () => {}) {
  const results = {
    reports: { total: 0, synced: 0, failed: 0 },
    panels: { total: 0, synced: 0, failed: 0 },
    users: { total: 0, created: 0, skipped: 0, failed: 0 },
  };

  // ── 1. MIGRATE REPORTS ──────────────────────────────────────────────────────
  const reports = readLocalReports();
  results.reports.total = reports.length;
  const updatedReports = [...reports];

  for (let i = 0; i < reports.length; i++) {
    const report = reports[i];

    // Skip already-synced entries to keep migration idempotent
    if (report.syncStatus === "synced" && report.remoteId) {
      results.reports.synced++;
      onProgress({ type: "report", done: i + 1, total: reports.length, status: "synced", item: report.requestId });
      continue;
    }

    try {
      const res = await createVanRequest(report);
      const remoteId = res.data?.id;
      updatedReports[i] = { ...report, syncStatus: "synced", remoteId };
      results.reports.synced++;

      // Upload any IndexedDB file blobs for this report
      try {
        const files = await loadReportFiles(report.requestId, REPORT_FILE_FIELDS);
        for (const slot of REPORT_FILE_FIELDS) {
          const blob = files[slot];
          if (!blob) continue;
          try {
            const fileRes = await uploadReportFile(remoteId, slot, blob);
            const field = slotToField[slot];
            if (field && fileRes.data?.fileName) {
              updatedReports[i] = { ...updatedReports[i], [field]: fileRes.data.fileName };
            }
          } catch { /* silent — file upload failure does not block migration */ }
        }
      } catch { /* IndexedDB unavailable */ }
    } catch {
      updatedReports[i] = { ...report, syncStatus: "failed" };
      results.reports.failed++;
    }

    onProgress({ type: "report", done: i + 1, total: reports.length, status: updatedReports[i].syncStatus, item: report.requestId });
    writeLocalReports(updatedReports);
  }

  // ── 2. MIGRATE ADMIN PANELS ─────────────────────────────────────────────────
  const panels = readAdminPanelHistory();
  results.panels.total = panels.length;
  const updatedPanels = [...panels];

  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];

    if (panel.syncStatus === "synced" && panel.remoteId) {
      results.panels.synced++;
      onProgress({ type: "panel", done: i + 1, total: panels.length, status: "synced", item: panel.missionCode });
      continue;
    }

    try {
      const res = await createAdminPanel({
        missionCode: panel.missionCode,
        missionTitle: panel.missionTitle ?? "",
        missionPlace: panel.missionPlace ?? "",
        missionTime: panel.missionTime ?? "",
        participantCount: panel.participantCount ? Number(panel.participantCount) : null,
        missionVia: panel.missionVia ?? "",
      });
      const remoteId = res.data?.id;
      updatedPanels[i] = { ...panel, syncStatus: "synced", remoteId };
      results.panels.synced++;

      // Upload plan file if present in IndexedDB
      if (panel.requestPlanFileKey && remoteId) {
        try {
          const blob = await loadAdminMissionFile(panel.requestPlanFileKey);
          if (blob) {
            const file = panel.requestPlanFileName
              ? new File([blob], panel.requestPlanFileName, { type: blob.type })
              : blob;
            const fileRes = await uploadAdminFile(remoteId, file);
            if (fileRes.data?.fileName) {
              updatedPanels[i] = { ...updatedPanels[i], requestPlanFileName: fileRes.data.fileName };
            }
          }
        } catch { /* silent */ }
      }
    } catch {
      updatedPanels[i] = { ...panel, syncStatus: "failed" };
      results.panels.failed++;
    }

    onProgress({ type: "panel", done: i + 1, total: panels.length, status: updatedPanels[i].syncStatus, item: panel.missionCode });
    writeAdminPanelHistory(updatedPanels);
  }

  // ── 3. MIGRATE USERS ────────────────────────────────────────────────────────
  const accounts = readLocalAccounts();
  results.users.total = accounts.length;

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    try {
      await createUser({
        unitName: account.unitName,
        username: account.username,
        password: "reset-required",
        role: account.role,
      });
      results.users.created++;
      onProgress({ type: "user", done: i + 1, total: accounts.length, status: "created", item: account.username });
    } catch (err) {
      const status = err?.response?.status === 409 ? "skipped" : "failed";
      if (status === "skipped") results.users.skipped++;
      else results.users.failed++;
      onProgress({ type: "user", done: i + 1, total: accounts.length, status, item: account.username });
    }
  }

  return results;
}
