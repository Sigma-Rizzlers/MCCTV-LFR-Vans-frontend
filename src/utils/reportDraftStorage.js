const DRAFT_KEY_PREFIX = "mcctv:report-draft:";

export function saveDraft(username, formData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DRAFT_KEY_PREFIX + (username || "guest"),
      JSON.stringify({ formData, savedAt: new Date().toISOString() })
    );
  } catch { /* storage full or unavailable */ }
}

export function loadDraft(username) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY_PREFIX + (username || "guest"));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.formData) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(username) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY_PREFIX + (username || "guest"));
  } catch { /* ignore */ }
}
