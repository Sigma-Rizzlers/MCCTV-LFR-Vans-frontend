import { useEffect, useMemo, useState } from "react";
import { getRequestStatus, requestStatusLabelMap, summarizeRequestStatuses } from "../constants/requestStatus";

const filterOptions = [
  { id: "all", label: "ទាំងអស់" },
  { id: "pending", label: requestStatusLabelMap.pending },
  { id: "approved", label: requestStatusLabelMap.approved },
  { id: "rejected", label: requestStatusLabelMap.rejected }
];

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

export default function ApprovalSection({ isActive, reports = [], onUpdateStatus, onOpenPdf }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedRequestId, setSelectedRequestId] = useState("");

  const summary = useMemo(() => summarizeRequestStatuses(reports), [reports]);
  const filteredReports = useMemo(
    () => (activeFilter === "all" ? reports : reports.filter((report) => getRequestStatus(report.approvalStatus) === activeFilter)),
    [activeFilter, reports]
  );

  useEffect(() => {
    if (!filteredReports.length) {
      setSelectedRequestId("");
      return;
    }

    const hasCurrentSelection = filteredReports.some((report) => report.requestId === selectedRequestId);
    if (!hasCurrentSelection) {
      setSelectedRequestId(filteredReports[0].requestId);
    }
  }, [filteredReports, selectedRequestId]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.requestId === selectedRequestId) ?? null,
    [reports, selectedRequestId]
  );
  const selectedStatus = getRequestStatus(selectedReport?.approvalStatus);

  return (
    <section id="approval" className={`page-section ${isActive ? "active" : ""}`}>
      <div className="section-header">
        <div>
          <h2>ការអនុម័ត</h2>
          <p>បញ្ជីសំណើដែលកំពុងរង់ចាំការអនុម័ត អនុម័តរួច និងមិនអនុម័ត។</p>
        </div>
        <div className="tag-row">
          <div className="tag pending">កំពុងរង់ចាំ: {summary.pending}</div>
          <div className="tag approved">អនុម័ត: {summary.approved}</div>
          <div className="tag rejected">មិនអនុម័ត: {summary.rejected}</div>
        </div>
      </div>

      <div className="approval-toolbar">
        {filterOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`approval-filter ${activeFilter === option.id ? "active" : ""}`}
            onClick={() => setActiveFilter(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="approval-grid">
        <div className="history-card">
          <div className="list-header">
            <h3>បញ្ជីសំណើសម្រាប់ពិនិត្យ</h3>
            <span className="pill muted">{filteredReports.length} សំណើ</span>
          </div>

          {filteredReports.length ? (
            <div className="history-list">
              {filteredReports.map((report) => {
                const status = getRequestStatus(report.approvalStatus);
                return (
                  <button
                    key={report.requestId}
                    className={`approval-item ${selectedRequestId === report.requestId ? "active" : ""}`}
                    type="button"
                    onClick={() => setSelectedRequestId(report.requestId)}
                  >
                    <div className="history-item-top">
                      <strong>{report.requestId}</strong>
                      <span className={`tag ${status}`}>{requestStatusLabelMap[status]}</span>
                    </div>
                    <div className="history-item-title">{renderValue(report.formData?.mission_title)}</div>
                    <div className="history-item-meta">
                      {renderValue(report.formData?.full_name)} | {formatDateTime(report.submittedAt)}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty">មិនមានសំណើស្ថិតក្នុងតម្រងនេះទេ។</div>
          )}
        </div>

        <div className="detail-card">
          <div className="list-header">
            <h3>ព័ត៌មានសំណើ</h3>
            <span className="pill outline">{selectedReport ? selectedReport.requestId : "-"}</span>
          </div>

          {selectedReport ? (
            <>
              <div className="detail-grid">
                <div className="detail-row">
                  <span>ស្ថានភាព</span>
                  <strong>{requestStatusLabelMap[selectedStatus]}</strong>
                </div>
                <div className="detail-row">
                  <span>ពេលបញ្ជូន</span>
                  <strong>{formatDateTime(selectedReport.submittedAt)}</strong>
                </div>
                <div className="detail-row">
                  <span>អ្នកស្នើសុំ</span>
                  <strong>{renderValue(selectedReport.formData?.full_name)}</strong>
                </div>
                <div className="detail-row">
                  <span>លេខទូរស័ព្ទ</span>
                  <strong>{renderValue(selectedReport.formData?.phone_number)}</strong>
                </div>
                <div className="detail-row">
                  <span>ឈ្មោះបេសកកម្ម</span>
                  <strong>{renderValue(selectedReport.formData?.mission_title)}</strong>
                </div>
                <div className="detail-row">
                  <span>ទីកន្លែងបេសកកម្ម</span>
                  <strong>{renderValue(selectedReport.formData?.stops)}</strong>
                </div>
                <div className="detail-row">
                  <span>សមាជិកបន្ថែម</span>
                  <strong>{selectedReport.members?.length ?? 0} នាក់</strong>
                </div>
              </div>

              <div className="detail-note">{renderValue(selectedReport.formData?.request_note)}</div>

              <div className="approval-actions">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => onUpdateStatus?.(selectedReport.requestId, "pending")}
                  disabled={selectedStatus === "pending"}
                >
                  ដាក់រង់ចាំ
                </button>
                <button
                  className="primary"
                  type="button"
                  onClick={() => onUpdateStatus?.(selectedReport.requestId, "approved")}
                  disabled={selectedStatus === "approved"}
                >
                  អនុម័ត
                </button>
                <button
                  className="ghost approval-reject"
                  type="button"
                  onClick={() => onUpdateStatus?.(selectedReport.requestId, "rejected")}
                  disabled={selectedStatus === "rejected"}
                >
                  មិនអនុម័ត
                </button>
                <button className="ghost" type="button" onClick={() => onOpenPdf?.(selectedReport.requestId)}>
                  បើក PDF
                </button>
              </div>
            </>
          ) : (
            <div className="empty">ជ្រើសរើសសំណើមួយពីបញ្ជីខាងឆ្វេង ដើម្បីអនុម័ត ឬមិនអនុម័ត។</div>
          )}
        </div>
      </div>
    </section>
  );
}
