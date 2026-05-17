import { DATA_MODE } from "../utils/dataMode";
import {
  listVanRequests,
  getVanRequest,
  createVanRequest,
  patchVanRequest,
  deleteVanRequest,
  mapBackendVanRequest,
} from "../api/services";
import {
  getCachedReports,
  getCachedReport,
  cacheReports,
  cacheReport,
  removeCachedReport,
} from "../utils/reportCache";

// ─── Local adapter (cache-backed) ────────────────────────────────────────────

const localAdapter = {
  getAll(filters = {}) {
    let reports = getCachedReports();
    if (filters.status)
      reports = reports.filter((r) => r.approvalStatus === filters.status);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      reports = reports.filter(
        (r) =>
          r.requestId?.toLowerCase().includes(q) ||
          r.submitterUsername?.toLowerCase().includes(q) ||
          r.formData?.missionTitle?.toLowerCase().includes(q) ||
          r.formData?.missionPlace?.toLowerCase().includes(q)
      );
    }
    if (filters.submitterUsername)
      reports = reports.filter((r) => r.submitterUsername === filters.submitterUsername);
    return Promise.resolve(reports);
  },

  getById(id) {
    const reports = getCachedReports();
    const found = reports.find((r) => r.requestId === id || String(r.id) === String(id));
    return found ? Promise.resolve(found) : Promise.reject(new Error("Not found"));
  },

  save(report) {
    cacheReport(report);
    return Promise.resolve(report);
  },

  update(id, patch) {
    const reports = getCachedReports();
    const idx = reports.findIndex((r) => r.requestId === id || String(r.id) === String(id));
    if (idx < 0) return Promise.reject(new Error("Not found"));
    const updated = { ...reports[idx], ...patch };
    cacheReport(updated);
    return Promise.resolve(updated);
  },

  remove(id) {
    removeCachedReport(id);
    return Promise.resolve();
  },
};

// ─── API adapter (cache-populating) ──────────────────────────────────────────

const apiAdapter = {
  async getAll(filters = {}) {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    if (filters.submitterUsername) params.submitter_username = filters.submitterUsername;
    if (filters.ordering) params.ordering = filters.ordering;
    try {
      const res = await listVanRequests(params);
      const items = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      const mapped = items.map(mapBackendVanRequest);
      cacheReports(mapped);
      return mapped;
    } catch {
      return getCachedReports();
    }
  },

  async getById(id) {
    try {
      const res = await getVanRequest(id);
      const mapped = mapBackendVanRequest(res.data);
      cacheReport(mapped);
      return mapped;
    } catch {
      const cached = getCachedReport(id);
      if (cached) return cached;
      throw new Error("Not found");
    }
  },

  async save(report) {
    const res = await createVanRequest(report);
    const mapped = mapBackendVanRequest(res.data);
    cacheReport(mapped);
    return mapped;
  },

  async update(id, patch) {
    const res = await patchVanRequest(id, patch);
    const mapped = mapBackendVanRequest(res.data);
    cacheReport(mapped);
    return mapped;
  },

  async remove(id) {
    const cached = getCachedReport(id);
    await deleteVanRequest(id);
    removeCachedReport(cached?.requestId ?? id);
  },
};

// ─── Dual adapter (optimistic cache + background API) ────────────────────────

const dualAdapter = {
  async getAll(filters = {}) {
    return apiAdapter.getAll(filters);
  },

  async getById(id) {
    return apiAdapter.getById(id);
  },

  async save(report) {
    cacheReport({ ...report, syncStatus: "pending" });
    try {
      const res = await createVanRequest(report);
      const mapped = mapBackendVanRequest(res.data);
      cacheReport({ ...mapped, syncStatus: "synced" });
      return mapped;
    } catch (err) {
      cacheReport({ ...report, syncStatus: "failed" });
      throw err;
    }
  },

  async update(id, patch) {
    const existing = getCachedReport(id) ?? {};
    cacheReport({ ...existing, ...patch, syncStatus: "pending" });
    try {
      const res = await patchVanRequest(id, patch);
      const mapped = mapBackendVanRequest(res.data);
      cacheReport({ ...mapped, syncStatus: "synced" });
      return mapped;
    } catch (err) {
      cacheReport({ ...existing, ...patch, syncStatus: "failed" });
      throw err;
    }
  },

  async remove(id) {
    const cached = getCachedReport(id);
    removeCachedReport(cached?.requestId ?? id);
    try {
      await deleteVanRequest(id);
    } catch {
      if (cached) cacheReport(cached);
      throw new Error("Remove failed — restored from cache");
    }
  },
};

export default DATA_MODE === "api"
  ? apiAdapter
  : DATA_MODE === "dual"
  ? dualAdapter
  : localAdapter;
