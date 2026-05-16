import { useEffect, useMemo, useState } from "react";

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

  const [selectedRequestId, setSelectedRequestId] = useState(myReports[0]?.requestId ?? "");

  useEffect(() => {
    if (!myReports.length) { setSelectedRequestId(""); return; }
    const hasSelection = myReports.some((r) => r.requestId === selectedRequestId);
    if (!hasSelection) setSelectedRequestId(myReports[0].requestId);
  }, [myReports, selectedRequestId]);

  const selectedReport = useMemo(
    () => myReports.find((r) => r.requestId === selectedRequestId) ?? null,
    [myReports, selectedRequestId]
  );

  const editHistory = Array.isArray(selectedReport?.editHistory) ? selectedReport.editHistory : [];

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
      </div>

      <div className="history-grid">
        <div className="history-card">
          <div className="list-header">
            <h3>បញ្ជីសំណើ</h3>
            <span className="pill muted">{myReports.length} កំណត់ត្រា</span>
          </div>

          {myReports.length ? (
            <div className="history-list">
              {myReports.map((report) => {
                const isSelected = report.requestId === selectedRequestId;
                const editCount = Array.isArray(report.editHistory) ? report.editHistory.length : 0;
                return (
                  <button
                    key={report.requestId}
                    className={`history-item ${isSelected ? "active" : ""}`}
                    type="button"
                    onClick={() => setSelectedRequestId(report.requestId)}
                  >
                    <div className="history-item-top">
                      <strong>{report.requestId}</strong>
                      {editCount > 0 && (
                        <span style={{
                          marginLeft: 6,
                          fontSize: 11,
                          background: "#9a7840",
                          color: "#fff",
                          borderRadius: "4px",
                          padding: "1px 6px",
                          fontWeight: 700
                        }}>
                          កែ {editCount}x
                        </span>
                      )}
                    </div>
                    <div className="history-item-title">{renderValue(report.formData?.missionTitle)}</div>
                    <div className="history-item-meta">
                      {formatDateTime(report.submittedAt)} | {renderValue(report.formData?.name)}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty">មិនទាន់មានសំណើនៅឡើយទេ។ សូមបំពេញសំណើថ្មី។</div>
          )}
        </div>

        <div className="detail-card">
          <div className="list-header">
            <h3>ព័ត៌មានលម្អិត</h3>
            <span className="pill outline">{selectedReport ? selectedReport.requestId : "-"}</span>
          </div>

          {selectedReport ? (
            <>
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
                  <span>ទីកន្លែងបេសកកម្ម</span>
                  <strong>{renderValue(selectedReport.formData?.missionPlace)}</strong>
                </div>
                <div className="detail-row">
                  <span>អ្នកស្នើសុំ</span>
                  <strong>{renderValue(selectedReport.formData?.name)}</strong>
                </div>
                <div className="detail-row">
                  <span>លេខទូរស័ព្ទ</span>
                  <strong>{renderValue(selectedReport.formData?.phone)}</strong>
                </div>
                <div className="detail-row">
                  <span>សមាជិកបន្ថែម</span>
                  <strong>{selectedReport.members?.length ?? 0} នាក់</strong>
                </div>
              </div>

              {editHistory.length > 0 && (
                <div style={{ marginTop: 14, borderTop: "1px solid #e6dccb", paddingTop: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#5b4a2a", marginBottom: 6 }}>
                    ប្រវត្តិការកែប្រែ ({editHistory.length} ដង)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {editHistory.map((snap, i) => (
                      <div key={i} style={{
                        fontSize: 12,
                        color: "#7a694d",
                        background: "#fafaf8",
                        border: "1px solid #e6dccb",
                        borderRadius: 6,
                        padding: "5px 10px",
                        display: "flex",
                        justifyContent: "space-between"
                      }}>
                        <span>កំណែ {i + 1}</span>
                        <span>{formatDateTime(snap.editedAt)}</span>
                      </div>
                    ))}
                    <div style={{
                      fontSize: 12,
                      color: "#2f8d43",
                      background: "#f0faf3",
                      border: "1px solid #b6dfc2",
                      borderRadius: 6,
                      padding: "5px 10px",
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 700
                    }}>
                      <span>កំណែ {editHistory.length + 1} (បច្ចុប្បន្ន)</span>
                      <span>{formatDateTime(selectedReport.lastEditedAt)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="detail-actions" style={{ marginTop: 14 }}>
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
            </>
          ) : (
            <div className="empty">ជ្រើសរើសសំណើពីបញ្ជីខាងឆ្វេង។</div>
          )}
        </div>
      </div>
    </section>
  );
}
