import { getAuditLogs, createAuditLog } from "../api/services";
import { DATA_MODE } from "./dataMode";

const LS_KEY = "mcctv:sys-manager-audit-log";

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

/** Synchronous read from localStorage — use for initial component state. */
export function readLocalAuditLog() {
  return readLocal();
}

/**
 * In api/dual mode: fetches from API, overwrites localStorage with the
 * authoritative list, and returns it. Falls back to localStorage on error.
 * In local mode: reads localStorage only.
 */
export async function loadSysManagerAuditLog() {
  if (DATA_MODE === "local") {
    return readLocal();
  }
  try {
    const res = await getAuditLogs();
    const entries = Array.isArray(res.data) ? res.data : [];
    writeLocal(entries);
    return entries;
  } catch {
    return readLocal();
  }
}

/**
 * Writes an entry to localStorage immediately for an optimistic UI update,
 * and fires a background POST to the API in api/dual mode.
 * Returns the updated local array so the caller can set state right away.
 */
export function addSysManagerAuditLog(entry) {
  const newEntry = {
    ...entry,
    id: Date.now(),
    performedBy: sessionStorage.getItem("mcctv:session-username") ?? "",
    createdAt: new Date().toISOString(),
  };

  const updated = [newEntry, ...readLocal()];
  writeLocal(updated);

  if (DATA_MODE !== "local") {
    createAuditLog(
      entry.action ?? "",
      entry.target ?? "",
      entry.detail ?? ""
    ).catch(() => {});
  }

  return updated;
}
