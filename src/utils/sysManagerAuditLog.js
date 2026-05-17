const auditLogKey = "mcctv:sysmanager-audit-log";
const maxAuditEntries = 300;

function toText(value) {
  return String(value ?? "").trim();
}

function createAuditId() {
  return `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeAuditEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const id = toText(entry.id);
  const action = toText(entry.action);
  const createdAt = toText(entry.createdAt);
  if (!id || !action || !createdAt) return null;

  return {
    id,
    action,
    target: toText(entry.target),
    detail: toText(entry.detail),
    createdAt
  };
}

export function loadSysManagerAuditLog() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(auditLogKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeAuditEntry).filter(Boolean).slice(0, maxAuditEntries);
  } catch {
    return [];
  }
}

export function addSysManagerAuditLog(entry) {
  if (typeof window === "undefined") return null;

  const nextEntry = sanitizeAuditEntry({
    id: createAuditId(),
    createdAt: new Date().toISOString(),
    ...entry
  });
  if (!nextEntry) return null;

  const nextLog = [nextEntry, ...loadSysManagerAuditLog()].slice(0, maxAuditEntries);
  window.localStorage.setItem(auditLogKey, JSON.stringify(nextLog));
  return nextEntry;
}
