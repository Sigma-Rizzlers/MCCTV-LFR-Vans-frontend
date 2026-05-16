import { useEffect, useMemo, useRef, useState } from "react";
import { loadReportFiles, REPORT_FILE_FIELDS } from "../../../utils/reportFileStore";

const ITEMS_PER_PAGE = 10;

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("km-KH", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  }).format(date);
}

function renderValue(value) {
  return String(value ?? "").trim() || "មិនបានបញ្ចូល";
}

const FIELD_LABELS = {
  support: "ឯកសារផ្លូវការ",
  lodging: "ស្នាក់នៅ",
  breakfast: "អាហារព្រឹក",
  lunch: "អាហារថ្ងៃ",
  dinner: "អាហារល្ងាច",
  implementation: "អនុវត្ត"
};

const FILE_NAME_MAP_KEYS = {
  support: "supportFileName",
  lodging: "lodgingImageName",
  breakfast: "breakfastImageName",
  lunch: "lunchImageName",
  dinner: "dinnerImageName",
  implementation: "implementationImageName"
};

export default function HistorySection({
  isActive,
  reports = [],
  currentUsername = "",
  onOpenPdf,
  onStartEdit
}) {
  const myReports = useMemo(
    () => reports.filter((r) => !currentUsername || r.submitterUsername === currentUsername),
    [reports, currentUsername]
  );

  // Nothing selected by default — user must click a report
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [fileUrls, setFileUrls] = useState({});
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const fileUrlsRef = useRef({});

  // Filter by search text, then sort
  const filteredReports = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const base = q
      ? myReports.filter((r) =>
          r.requestId?.toLowerCase().includes(q) ||
          r.formData?.missionTitle?.toLowerCase().includes(q) ||
          r.formData?.missionPlace?.toLowerCase().includes(q)
        )
      : myReports;
    return sortOrder === "oldest"
      ? [...base].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
      : [...base].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }, [myReports, searchText, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / ITEMS_PER_PAGE));
  const pagedReports = filteredReports.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 when the report list or search changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRequestId("");
  }, [myReports.length]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedRequestId("");
  }, [searchText, sortOrder]);

  // Clear selection if the selected report is no longer on the current page
  useEffect(() => {
    if (!selectedRequestId) return;
    const stillExists = myReports.some((r) => r.requestId === selectedRequestId);
    if (!stillExists) setSelectedRequestId("");
  }, [myReports, selectedRequestId]);

  const selectedReport = useMemo(
    () => myReports.find((r) => r.requestId === selectedRequestId) ?? null,
    [myReports, selectedRequestId]
  );

  // Load files from IndexedDB when selected report changes
  useEffect(() => {
    Object.values(fileUrlsRef.current).forEach((f) => { if (f?.url) URL.revokeObjectURL(f.url); });
    fileUrlsRef.current = {};
    setFileUrls({});
    setLightboxUrl(null);

    if (!selectedReport?.requestId) return;

    let cancelled = false;
    setLoadingFiles(true);

    loadReportFiles(selectedReport.requestId).then((files) => {
      if (cancelled) return;
      const urls = {};
      for (const [fieldName, file] of Object.entries(files)) {
        if (file instanceof Blob) {
          urls[fieldName] = {
            url: URL.createObjectURL(file),
            name: file.name ?? fieldName,
            type: file.type ?? ""
          };
        }
      }
      fileUrlsRef.current = urls;
      setFileUrls(urls);
      setLoadingFiles(false);
    }).catch(() => {
      if (!cancelled) setLoadingFiles(false);
    });

    return () => {
      cancelled = true;
      Object.values(fileUrlsRef.current).forEach((f) => { if (f?.url) URL.revokeObjectURL(f.url); });
      fileUrlsRef.current = {};
    };
  }, [selectedRequestId]);

  const editHistory = Array.isArray(selectedReport?.editHistory) ? selectedReport.editHistory : [];

  const fileNameMap = selectedReport ? Object.fromEntries(
    REPORT_FILE_FIELDS.map((f) => [f, selectedReport[FILE_NAME_MAP_KEYS[f]] ?? ""])
  ) : {};

  const attachmentFields = REPORT_FILE_FIELDS.filter(
    (f) => fileUrls[f] || fileNameMap[f]
  );

  function handleSelectReport(requestId) {
    // Toggle off if clicking the already-selected report
    setSelectedRequestId((prev) => (prev === requestId ? "" : requestId));
  }

  return (
    <section id="mysubmissions" className={`page-section ${isActive ? "active" : ""}`}>
      <div className="section-header">
        <div>
          <h2>ការបញ្ជូនរបស់ខ្ញុំ</h2>
          <p>សំណើដែលអ្នកបានបញ្ជូន — អ្នកអាចកែប្រែវាបាន ប៉ុន្តែមិនអាចលុបបានទេ។</p>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-value">{myReports.length}</div>
          <div className="summary-label">សំណើសរុប</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">
            {myReports.reduce((n, r) => n + (Array.isArray(r.editHistory) ? r.editHistory.length : 0), 0)}
          </div>
          <div className="summary-label">ការកែប្រែសរុប</div>
        </div>
      </div>

      {/* ── Block 1: Submission list ── */}
      <div className="history-card" style={{ marginBottom: 20 }}>
        <div className="list-header">
          <h3>បញ្ជីសំណើ</h3>
          <span className="pill muted">{filteredReports.length}/{myReports.length} កំណត់ត្រា</span>
        </div>

        {/* Search & filter toolbar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
            <span style={{
              position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
              color: "#999", fontSize: 15, pointerEvents: "none"
            }}>🔍</span>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="ស្វែងរកតាមឈ្មោះ, ទីកន្លែង, លេខ..."
              style={{
                width: "100%", padding: "8px 10px 8px 34px",
                border: "2px solid #c89318", borderRadius: 8,
                fontSize: 13, fontFamily: "inherit",
                background: "#fff", color: "#111", outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              padding: "8px 12px", border: "2px solid #c89318",
              borderRadius: 8, fontSize: 13, fontFamily: "inherit",
              background: "#fff", color: "#111", cursor: "pointer", outline: "none"
            }}
          >
            <option value="newest">ថ្មី → ចាស់</option>
            <option value="oldest">ចាស់ → ថ្មី</option>
          </select>
        </div>

        {myReports.length ? (
          <>
            <div className="history-list">
              {pagedReports.map((report) => {
                const isSelected = report.requestId === selectedRequestId;
                const editCount = Array.isArray(report.editHistory) ? report.editHistory.length : 0;
                return (
                  <button
                    key={report.requestId}
                    className={`history-item ${isSelected ? "active" : ""}`}
                    type="button"
                    onClick={() => handleSelectReport(report.requestId)}
                  >
                    <div className="history-item-top">
                      <strong>{report.requestId}</strong>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {editCount > 0 && (
                          <span style={{
                            fontSize: 11, background: "#9a7840", color: "#fff",
                            borderRadius: "4px", padding: "1px 6px", fontWeight: 700, flexShrink: 0
                          }}>
                            កែ {editCount}x
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: isSelected ? "#7a4c0c" : "#aaa", flexShrink: 0 }}>
                          {isSelected ? "▲ បិទ" : "▼ មើល"}
                        </span>
                      </div>
                    </div>
                    <div className="history-item-title">{renderValue(report.formData?.missionTitle)}</div>
                    <div className="history-item-meta">
                      {formatDateTime(report.submittedAt)}
                      {report.formData?.missionPlace ? ` · ${report.formData.missionPlace}` : ""}
                    </div>
                    {report.lastEditedAt && (
                      <div style={{ marginTop: 4, fontSize: 11, color: "#888" }}>
                        កែចុងក្រោយ: {formatDateTime(report.lastEditedAt)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-bar">
                <span className="pagination-info">
                  ទំព័រ {currentPage} / {totalPages} ({myReports.length} សំណើ)
                </span>
                <div className="pagination-controls">
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => { setCurrentPage(1); setSelectedRequestId(""); }}
                    title="ទំព័រដំបូង"
                  >
                    «
                  </button>
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => { setCurrentPage((p) => p - 1); setSelectedRequestId(""); }}
                  >
                    ‹ មុន
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "…" ? (
                        <span key={`ellipsis-${idx}`} style={{ padding: "0 4px", color: "#888" }}>…</span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          className={`pagination-btn ${currentPage === item ? "active-page" : ""}`}
                          onClick={() => { setCurrentPage(item); setSelectedRequestId(""); }}
                        >
                          {item}
                        </button>
                      )
                    )}
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => { setCurrentPage((p) => p + 1); setSelectedRequestId(""); }}
                  >
                    បន្ទាប់ ›
                  </button>
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => { setCurrentPage(totalPages); setSelectedRequestId(""); }}
                    title="ទំព័រចុងក្រោយ"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        ) : myReports.length === 0 ? (
          <div className="empty">មិនទាន់មានសំណើនៅឡើយទេ។ សូមបំពេញសំណើថ្មី។</div>
        ) : (
          <div className="empty">រកមិនឃើញសំណើដែលត្រូវនឹង &ldquo;{searchText}&rdquo;។</div>
        )}
      </div>

      {/* ── Block 2: Detail panel — only shown when a report is selected ── */}
      {selectedReport && (
        <div className="detail-card">
          <div className="list-header">
            <h3>ព័ត៌មានលម្អិត</h3>
            <span className="pill outline">{selectedReport.requestId}</span>
          </div>

          {/* Basic info */}
          <div className="detail-grid">
            <div className="detail-row">
              <span>ពេលបញ្ជូន</span>
              <strong>{formatDateTime(selectedReport.submittedAt)}</strong>
            </div>
            {selectedReport.lastEditedAt && (
              <div className="detail-row">
                <span>កែប្រែចុងក្រោយ</span>
                <strong>{formatDateTime(selectedReport.lastEditedAt)}</strong>
              </div>
            )}
            <div className="detail-row">
              <span>ឈ្មោះបេសកកម្ម</span>
              <strong>{renderValue(selectedReport.formData?.missionTitle)}</strong>
            </div>
            <div className="detail-row">
              <span>ទីកន្លែង</span>
              <strong>{renderValue(selectedReport.formData?.missionPlace)}</strong>
            </div>
            <div className="detail-row">
              <span>ចំនួនជាក់ស្តែង</span>
              <strong>{selectedReport.members?.length ?? 0} នាក់</strong>
            </div>
          </div>

          {/* Edit history timeline */}
          {editHistory.length > 0 && (
            <div style={{ marginTop: 14, borderTop: "1px solid rgba(199,145,44,0.25)", paddingTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111111", marginBottom: 6 }}>
                ប្រវត្តិការកែប្រែ ({editHistory.length} ដង)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {editHistory.map((snap, i) => (
                  <div key={i} style={{
                    fontSize: 12, color: "#7a694d",
                    background: "#fafaf8", border: "1px solid #e6dccb",
                    borderRadius: 6, padding: "5px 10px",
                    display: "flex", justifyContent: "space-between"
                  }}>
                    <span>កំណែ {i + 1}</span>
                    <span>{formatDateTime(snap.editedAt)}</span>
                  </div>
                ))}
                <div style={{
                  fontSize: 12, color: "#2f8d43",
                  background: "#f0faf3", border: "1px solid #b6dfc2",
                  borderRadius: 6, padding: "5px 10px",
                  display: "flex", justifyContent: "space-between", fontWeight: 700
                }}>
                  <span>កំណែ {editHistory.length + 1} (បច្ចុប្បន្ន)</span>
                  <span>{formatDateTime(selectedReport.lastEditedAt || selectedReport.submittedAt)}</span>
                </div>
              </div>
            </div>
          )}

          {/* File attachments */}
          {(loadingFiles || attachmentFields.length > 0) && (
            <div style={{ marginTop: 14, borderTop: "1px solid rgba(199,145,44,0.25)", paddingTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111111", marginBottom: 8 }}>
                ឯកសារភ្ជាប់
              </div>
              {loadingFiles ? (
                <div style={{ color: "#9a7840", fontSize: 12 }}>កំពុងទាញឯកសារ...</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {attachmentFields.map((field) => {
                    const fileEntry = fileUrls[field];
                    const fileName = fileNameMap[field];
                    const isImage = fileEntry?.type?.startsWith("image/");
                    const label = FIELD_LABELS[field];
                    return (
                      <div key={field} style={{
                        background: "#fff", border: "1px solid rgba(199,145,44,0.35)",
                        borderRadius: 8, padding: "8px",
                        display: "flex", flexDirection: "column", gap: 4
                      }}>
                        <div style={{ fontSize: 11, color: "#9a7840", fontWeight: 600 }}>
                          {label}
                        </div>
                        {fileEntry ? (
                          isImage ? (
                            <button
                              type="button"
                              style={{ padding: 0, border: 0, background: "none", cursor: "pointer", borderRadius: 6, overflow: "hidden" }}
                              title="ចុចដើម្បីពង្រីក"
                              onClick={() => setLightboxUrl(fileEntry.url)}
                            >
                              <img
                                src={fileEntry.url}
                                alt={label}
                                style={{ width: "100%", height: 64, objectFit: "cover", borderRadius: 6, display: "block" }}
                              />
                            </button>
                          ) : (
                            <a
                              href={fileEntry.url}
                              target="_blank"
                              rel="noreferrer"
                              download={fileEntry.name}
                              style={{
                                display: "flex", alignItems: "center", gap: 5,
                                fontSize: 12, color: "#7a5820", textDecoration: "none",
                                background: "#fff", border: "1px solid rgba(199,145,44,0.3)",
                                borderRadius: 6, padding: "6px 8px", wordBreak: "break-all"
                              }}
                            >
                              <span>📄</span>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {fileEntry.name}
                              </span>
                            </a>
                          )
                        ) : (
                          <div style={{ fontSize: 11, color: "#bba46d", fontStyle: "italic" }}>
                            📎 {fileName}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="detail-actions" style={{ marginTop: 16 }}>
            <button
              className="primary"
              type="button"
              onClick={() => onStartEdit?.(selectedReport.requestId)}
            >
              កែប្រែ
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => onOpenPdf?.(selectedReport.requestId)}
            >
              មើល PDF
            </button>
          </div>
        </div>
      )}

      {/* Lightbox overlay */}
      {lightboxUrl && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
            zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "zoom-out"
          }}
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="preview"
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}
          />
          <button
            type="button"
            style={{
              position: "absolute", top: 20, right: 24,
              background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff", borderRadius: "50%", width: 36, height: 36,
              fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
            }}
            onClick={() => setLightboxUrl(null)}
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
}
