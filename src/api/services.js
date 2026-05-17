import api from "./axiosConfig";

// ─── Data mapper ─────────────────────────────────────────────────────────────

/**
 * Converts a single van request object from the backend shape to the shape
 * expected by the frontend components (HistorySection, ApprovalSection, etc.).
 *
 * Backend fields              → Frontend formData fields
 *   id                        → id  (kept for API calls)
 *   requestId                 → requestId  ("REQ-TEST-001")
 *   submittedAt               → submittedAt
 *   approvalStatus            → approvalStatus  ("pending"|"approved"|"rejected")
 *   formData.missionTitle     → formData.missionTitle
 *   formData.departureDate    → formData.departureDate
 *   formData.returnDate       → formData.returnDate
 *   formData.name             → formData.name
 *   formData.role             → formData.role
 */
export function mapBackendVanRequest(item) {
  const fd = item.formData ?? {};
  return {
    id: item.id,
    requestId: item.requestId ?? "REQ-" + String(item.id).padStart(6, "0"),
    submittedAt: item.submittedAt,
    approvalStatus: item.approvalStatus,
    formData: {
      missionTitle: fd.missionTitle ?? "",
      departureDate: fd.departureDate ?? "",
      returnDate: fd.returnDate ?? "",
      missionPlace: fd.missionPlace ?? "",
      mission: fd.mission ?? "",
      name: fd.name ?? "",
      phone: fd.phone ?? "",
      role: fd.role ?? "",
      requestNote: fd.requestNote ?? "",
    },
    supportFileName: item.supportFileName ?? "",
    members: item.members ?? [],
    vehicles: item.vehicles ?? [],
    equipmentItems: item.equipmentItems ?? [],
    adminPanel: item.adminPanel ?? {},
    editHistory: item.editHistory ?? [],
    lastEditedAt: item.lastEditedAt ?? null,
  };
}

// ─── Auth ────────────────────────────────────────────────────────────────────

/**
 * Exchange username + password for a DRF token.
 * Response: { token: "abc123..." }
 * Store the returned token in localStorage under "authToken".
 */
export const login = (username, password) =>
  api.post("/api/auth/token/", { username, password });

// ─── Health ─────────────────────────────────────────────────────────────────

export const checkHealth = () => api.get("/api/health/");

// ─── Van Requests ────────────────────────────────────────────────────────────

/**
 * List all van requests.
 * Supports query params: status, submitter_username, search, ordering
 */
export const listVanRequests = (params = {}) =>
  api.get("/api/v1/van-requests/", { params });

/** Get a single van request by ID. */
export const getVanRequest = (id) => api.get(`/api/v1/van-requests/${id}/`);

/** Create a new van request with nested stops and participants. */
export const createVanRequest = (data) => api.post("/api/v1/van-requests/", data);

/** Update an existing van request (full update). */
export const updateVanRequest = (id, data) =>
  api.put(`/api/v1/van-requests/${id}/`, data);

/** Partially update a van request. */
export const patchVanRequest = (id, data) =>
  api.patch(`/api/v1/van-requests/${id}/`, data);

/** Soft-delete a van request. */
export const deleteVanRequest = (id) => api.delete(`/api/v1/van-requests/${id}/`);

/**
 * Approve or reject a van request.
 * @param {number} id - Van request ID
 * @param {"approve"|"reject"} action
 * @param {string} [note] - Optional note
 */
export const approveVanRequest = (id, action, note = "") =>
  api.post(`/api/v1/van-requests/${id}/approve/`, { action, note });

// ─── Stops ───────────────────────────────────────────────────────────────────

/** List stops for a van request. */
export const listStops = (vanRequestId) =>
  api.get(`/api/v1/van-requests/${vanRequestId}/stops/`);

/** Add a stop to a van request. */
export const addStop = (vanRequestId, data) =>
  api.post(`/api/v1/van-requests/${vanRequestId}/stops/`, data);

/** Remove a stop from a van request. */
export const removeStop = (vanRequestId, stopId) =>
  api.delete(`/api/v1/van-requests/${vanRequestId}/stops/${stopId}/`);

// ─── Participants (nested under van request) ─────────────────────────────────

/** List participants on a specific van request. */
export const listVanRequestParticipants = (vanRequestId) =>
  api.get(`/api/v1/van-requests/${vanRequestId}/participants/`);

/** Add a participant to a van request (by ID or as new). */
export const addVanRequestParticipant = (vanRequestId, data) =>
  api.post(`/api/v1/van-requests/${vanRequestId}/participants/`, data);

/** Remove a participant from a van request. */
export const removeVanRequestParticipant = (vanRequestId, participantId) =>
  api.delete(
    `/api/v1/van-requests/${vanRequestId}/participants/${participantId}/`
  );

// ─── Participants (standalone) ────────────────────────────────────────────────

/** List all participants. Supports: search, ordering. */
export const listParticipants = (params = {}) =>
  api.get("/api/v1/participants/", { params });

/** Get a single participant by ID. */
export const getParticipant = (id) => api.get(`/api/v1/participants/${id}/`);

/** Create a new participant. */
export const createParticipant = (data) => api.post("/api/v1/participants/", data);

/** Update a participant (full update). */
export const updateParticipant = (id, data) =>
  api.put(`/api/v1/participants/${id}/`, data);

/** Partially update a participant. */
export const patchParticipant = (id, data) =>
  api.patch(`/api/v1/participants/${id}/`, data);

/** Soft-delete a participant. */
export const deleteParticipant = (id) => api.delete(`/api/v1/participants/${id}/`);

// ─── Audit Log ────────────────────────────────────────────────────────────────

/** List audit log entries. Supports query params passed as object. */
export const getAuditLogs = (params = {}) =>
  api.get("/api/v1/audit-log/", { params });

/** Create an audit log entry manually. */
export const createAuditLog = (action, target = "", detail = "") =>
  api.post("/api/v1/audit-log/", { action, target, detail });

// ─── Drafts ───────────────────────────────────────────────────────────────────

export const getDraft = () => api.get("/api/v1/drafts/me/");

export const saveDraft = (formData) =>
  api.put("/api/v1/drafts/me/", { formData });

// ─── File Attachments ─────────────────────────────────────────────────────────

export const uploadReportFile = (id, slot, file) => {
  const fd = new FormData();
  fd.append("file", file);
  return api.post(`/api/v1/van-requests/${id}/files/${slot}/`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
