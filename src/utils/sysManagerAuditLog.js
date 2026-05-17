import { getAuditLogs, createAuditLog } from "../api/services";

const LS_KEY = "mcctv:sys-manager-audit-log";
const DATA_MODE = import.meta?.env?.VITE_DATA_MODE ?? "local";

function readLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(entries) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries));
  } catch {}
}

/**
 * Returns audit log entries synchronously from localStorage cache.
 * When not in local mode, also fires a background API fetch to refresh
 * the cache so the next call returns up-to-date data.
 */
export function loadSysManagerAuditLog() {
  if (DATA_MODE !== "local") {
    getAuditLogs()
      .then((res) => {
        const entries = Array.isArray(res.data) ? res.data : [];
        writeLocal(entries);
      })
      .catch(() => {});
  }
  return readLocal();
}

/**
 * Writes an entry to localStorage immediately (so the page can re-read it
 * without waiting) and also posts to the API in the background.
 *
 * @param {{ action: string, target: string, detail: string }} entry
 */
export function addSysManagerAuditLog(entry) {
  const newEntry = {
    ...entry,
    id: Date.now(),
    performedBy: sessionStorage.getItem("mcctv:session-username") ?? "",
    createdAt: new Date().toISOString(),
  };

  writeLocal([newEntry, ...readLocal()]);

  if (DATA_MODE !== "local") {
    createAuditLog(
      entry.action ?? "",
      entry.target ?? "",
      entry.detail ?? ""
    ).catch(() => {});
  }
}
