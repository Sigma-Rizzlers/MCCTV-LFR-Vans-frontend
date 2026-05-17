export const CACHE_KEY = "mcctv:mission-request-history";
export const CACHE_TIMESTAMP_KEY = "mcctv:cache-timestamp";

export function getCachedReports() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function getCachedReport(requestId) {
  return getCachedReports().find((r) => r.requestId === requestId) ?? null;
}

export function cacheReports(reports) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(reports));
  stampCache();
}

export function cacheReport(report) {
  const existing = getCachedReports();
  const index = existing.findIndex((r) => r.requestId === report.requestId);
  if (index >= 0) existing[index] = report;
  else existing.push(report);
  localStorage.setItem(CACHE_KEY, JSON.stringify(existing));
  stampCache();
}

export function removeCachedReport(requestId) {
  const filtered = getCachedReports().filter((r) => r.requestId !== requestId);
  localStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
  stampCache();
}

export function stampCache() {
  localStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().toISOString());
}

export function getCacheAge() {
  return localStorage.getItem(CACHE_TIMESTAMP_KEY) ?? null;
}
