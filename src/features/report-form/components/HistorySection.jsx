import { useEffect, useMemo, useState } from "react";
import { getRequestStatus, requestStatusLabelMap, summarizeRequestStatuses } from "../constants/requestStatus";

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("km-KH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function renderValue(value) {
  const text = String(value ?? "").trim();
  return text || "មិនបានបញ្ចូល";
}

export default function HistorySection({ isActive, reports = [], onClearHistory, onOpenPdf }) {
  const [selectedRequestId, setSelectedRequestId] = useState(reports[0]?.requestId ?? "");

  useEffect(() => {
    if (!reports.length) {
      setSelectedRequestId("");
      return;
    }

    const hasSelection = reports.some((report) => report.requestId === selectedRequestId);
    if (!hasSelection) {
      setSelectedRequestId(reports[0].requestId);
    }
  }, [reports, selectedRequestId]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.requestId === selectedRequestId) ?? null,
    [reports, selectedRequestId]
  );
  const summary = useMemo(() => summarizeRequestStatuses(reports), [reports]);

  return (
    <section id="history" className={`page-section ${isActive ? "active" : ""}`}>
      <div className="section-header">
        <div>
          <h2>ប្រវត្តិសំណើ</h2>
          <p>បញ្ជីសំណើត្រូវបានរក្សាទុកក្នុងឧបករណ៍នេះ ដើម្បីតាមដាន និងបោះពុម្ព។</p>
        </div>
        <button className="ghost" type="button" onClick={onClearHistory} disabled={!reports.length}>
          លុបប្រវត្តិ
        </button>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-value">{summary.total}</div>
          <div className="summary-label">សំណើសរុប</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{summary.pending}</div>
          <div className="summary-label">កំពុងរង់ចាំ</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{summary.approved}</div>
          <div className="summary-label">អនុម័តរួច</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{summary.rejected}</div>
          <div className="summary-label">មិនអនុម័ត</div>
        </div>
      </div>

      <div className="history-grid">
        <div className="history-card">
          <div className="list-header">
            <h3>បញ្ជីសំណើថ្មីៗ</h3>
            <span className="pill muted">{reports.length} កំណត់ត្រា</span>
          </div>

          {reports.length ? (
            <div className="history-list">
              {reports.map((report) => {
                const statusValue = getRequestStatus(report.approvalStatus);
                const isSelected = report.requestId === selectedRequestId;
                return (
                  <button
                    key={report.requestId}
                    className={`history-item ${isSelected ? "active" : ""}`}
                    type="button"
                    onClick={() => setSelectedRequestId(report.requestId)}
                  >
                    <div className="history-item-top">
                      <strong>{report.requestId}</strong>
                      <span className={`tag ${statusValue}`}>{requestStatusLabelMap[statusValue]}</span>
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
            <div className="empty">មិនទាន់មានសំណើឡើយ។ សូមបំពេញសំណើថ្មី។</div>
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
                <div className="detail-row">
                  <span>ស្ថានភាព</span>
                  <strong>{requestStatusLabelMap[getRequestStatus(selectedReport.approvalStatus)]}</strong>
                </div>
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
              <div className="detail-note">{renderValue(selectedReport.formData?.requestNote)}</div>
              <div className="detail-actions">
                <button className="primary" type="button" onClick={() => onOpenPdf?.(selectedReport.requestId)}>
                  បើក PDF
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
