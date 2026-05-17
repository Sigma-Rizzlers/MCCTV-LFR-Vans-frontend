import { DATA_MODE } from "../utils/dataMode";
import {
  listVanRequests,
  getVanRequest,
  createVanRequest,
  patchVanRequest,
  deleteVanRequest,
  mapBackendVanRequest,
} from "../api/services";

const LOCAL_KEY = "mcctv:mission-request-history";

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

// ─── localAdapter ─────────────────────────────────────────────────────────────

const localAdapter = {
  getAll(filters = {}) {
    let reports = readLocalReports();
    if (filters.status) {
      reports = reports.filter((r) => r.approvalStatus === filters.status);
    }
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
    if (filters.submitterUsername) {
      reports = reports.filter((r) => r.submitterUsername === filters.submitterUsername);
    }
    return Promise.resolve(reports);
  },
  getById(id) {
    const reports = readLocalReports();
    const found = reports.find(
      (r) => r.requestId === id || String(r.id) === String(id)
    );
    return found
      ? Promise.resolve(found)
      : Promise.reject(new Error("Not found"));
  },
  save(report) {
    const reports = readLocalReports();
    const idx = reports.findIndex((r) => r.requestId === report.requestId);
    if (idx >= 0) { reports[idx] = report; } else { reports.unshift(report); }
    writeLocalReports(reports.slice(0, 100));
    return Promise.resolve(report);
  },
  update(id, patch) {
    const reports = readLocalReports();
    const idx = reports.findIndex(
      (r) => r.requestId === id || String(r.id) === String(id)
    );
    if (idx < 0) return Promise.reject(new Error("Not found"));
    reports[idx] = { ...reports[idx], ...patch };
    writeLocalReports(reports);
    return Promise.resolve(reports[idx]);
  },
  remove(id) {
    writeLocalReports(
      readLocalReports().filter(
        (r) => r.requestId !== id && String(r.id) !== String(id)
      )
    );
    return Promise.resolve();
  },
};

// ─── apiAdapter ───────────────────────────────────────────────────────────────

const apiAdapter = {
  async getAll(filters = {}) {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    if (filters.submitterUsername) params.submitter_username = filters.submitterUsername;
    if (filters.ordering) params.ordering = filters.ordering;
    const res = await listVanRequests(params);
    const items = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
    return items.map(mapBackendVanRequest);
  },
  async getById(id) {
    const res = await getVanRequest(id);
    return mapBackendVanRequest(res.data);
  },
  async save(report) {
    const res = await createVanRequest(report);
    return mapBackendVanRequest(res.data);
  },
  async update(id, patch) {
    const res = await patchVanRequest(id, patch);
    return mapBackendVanRequest(res.data);
  },
  async remove(id) {
    await deleteVanRequest(id);
  },
};

// ─── dualAdapter ──────────────────────────────────────────────────────────────

const dualAdapter = {
  async getAll(filters = {}) {
    try { return await apiAdapter.getAll(filters); } catch { return localAdapter.getAll(filters); }
  },
  async getById(id) {
    try { return await apiAdapter.getById(id); } catch { return localAdapter.getById(id); }
  },
  async save(report) {
    const local = await localAdapter.save(report);
    apiAdapter.save(report).catch(() => {});
    return local;
  },
  async update(id, patch) {
    const local = await localAdapter.update(id, patch);
    apiAdapter.update(id, patch).catch(() => {});
    return local;
  },
  async remove(id) {
    await localAdapter.remove(id);
    apiAdapter.remove(id).catch(() => {});
  },
};

// ─── active adapter ───────────────────────────────────────────────────────────

const requestStore =
  DATA_MODE === "api" ? apiAdapter :
  DATA_MODE === "dual" ? dualAdapter :
  localAdapter;

export default requestStore;
