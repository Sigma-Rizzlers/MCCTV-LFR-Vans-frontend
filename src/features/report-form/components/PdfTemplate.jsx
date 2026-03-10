import { useState } from "react";
import { exportReportToPdfBlob, openPrintFallbackFromElement, saveBlobToFile } from "../utils/pdfExport";
import { getRequestStatus, requestStatusLabelMap } from "../constants/requestStatus";

function formatDate(value) {
  if (!value) {
    return "មិនបានបញ្ចូល";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("km-KH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

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
  return String(value ?? "").trim() || "មិនបានបញ្ចូល";
}

function createPdfFileName(requestId) {
  const safeId = String(requestId ?? "")
    .trim()
    .replace(/[^A-Za-z0-9-_]/g, "-");
  return `MCCTV-request-${safeId || "unknown"}.pdf`;
}

export default function PdfTemplate({ report, onClose }) {
  const [isSavingFile, setIsSavingFile] = useState(false);
  if (!report) {
    return null;
  }

  const { formData, requestId, submittedAt, supportFileName, members } = report;
  const requesterName = renderValue(formData.name);
  const filledMembers = Array.isArray(members) ? members : [];
  const requestStatus = getRequestStatus(report.approvalStatus);
  const statusLabel = requestStatusLabelMap[requestStatus];
  const approvalDisplayText = requestStatus === "pending" ? "-" : "ប្រព័ន្ធស្នើសុំរថយន្ត MCCTV";
  const pdfTitleText =
    requestStatus === "approved"
      ? "បង្កាន់ដៃអនុម័តសំណើរថយន្តបេសកកម្ម"
      : requestStatus === "rejected"
        ? "បង្កាន់ដៃមិនអនុម័តសំណើរថយន្តបេសកកម្ម"
        : "បង្កាន់ដៃសំណើរថយន្តបេសកកម្ម";

  async function handleSavePdfFile() {
    if (isSavingFile) {
      return;
    }

    setIsSavingFile(true);

    try {
      const fileName = createPdfFileName(requestId);
      const pdfElement = document.getElementById("pdfTemplate");
      const pdfBlob = await exportReportToPdfBlob(report, { element: pdfElement });
      await saveBlobToFile(pdfBlob, fileName, null);
    } catch (error) {
      console.error(error);
      const pdfElement = document.getElementById("pdfTemplate");
      const opened = openPrintFallbackFromElement(pdfElement, createPdfFileName(requestId));
      if (!opened) {
        window.alert("Cannot save PDF right now. Please try again.");
      }
    } finally {
      setIsSavingFile(false);
    }
  }

  return (
    <div className="pdf-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="pdfTitle">
      <div className="pdf-preview-shell">
        <div className="pdf-preview-actions">
          <button
            className="ghost"
            type="button"
            onClick={onClose}
          >
            បិទ
          </button>
          <button className="primary" type="button" onClick={handleSavePdfFile} disabled={isSavingFile}>
            {isSavingFile ? "កំពុងរក្សាទុក..." : "រក្សាទុកទៅកុំព្យូទ័រ"}
          </button>
        </div>

        <article id="pdfTemplate" className="pdf-document">
          <header className="pdf-document-header">
            <div className="pdf-header-main">
              <div className="pdf-seal">
                <img className="pdf-logo" src="/about-moi-logo.png" alt="Ministry of Interior logo" />
              </div>
              <div>
                <h2 id="pdfTitle" className="pdf-main-title">
                  {pdfTitleText}
                </h2>
                <div className="pdf-main-subtitle">អង្គភាពប្រតិបត្តិការ MCCTV - ប្រព័ន្ធគ្រប់គ្រងកញ្ចប់រថយន្ត</div>
              </div>
            </div>
            <div className="pdf-request-box">
              <div className="pdf-request-label">លេខសំណើ</div>
              <div className="pdf-request-id">{requestId}</div>
              <div className="pdf-request-time">បង្កើត៖ {formatDateTime(submittedAt)}</div>
            </div>
          </header>

          <section className="pdf-status-row">
            <div className="pdf-status-title">ស្ថានភាពសំណើបេសកកម្ម</div>
            <div className={`pdf-status-badge ${requestStatus}`}>{statusLabel}</div>
          </section>

          <section className="pdf-grid">
            <section className="pdf-panel pdf-panel-full">
              <h3>ព័ត៌មានបេសកកម្ម</h3>
              <div className="pdf-row">
                <div className="pdf-label">ឈ្មោះបេសកកម្ម</div>
                <div className="pdf-value">{renderValue(formData.missionTitle)}</div>
              </div>
              <div className="pdf-row">
                <div className="pdf-label">ថ្ងៃចេញ</div>
                <div className="pdf-value">{formatDate(formData.departureDate)}</div>
              </div>
              <div className="pdf-row">
                <div className="pdf-label">ថ្ងៃត្រឡប់</div>
                <div className="pdf-value">{formatDate(formData.returnDate)}</div>
              </div>
              <div className="pdf-row">
                <div className="pdf-label">ទីកន្លែងបេសកកម្ម</div>
                <div className="pdf-value">{renderValue(formData.missionPlace)}</div>
              </div>
              <div className="pdf-row">
                <div className="pdf-label">គោលបំណង</div>
                <div className="pdf-value">{renderValue(formData.mission)}</div>
              </div>
            </section>

            <section className="pdf-panel pdf-panel-full">
              <h3>ព័ត៌មានអ្នកស្នើសុំ</h3>
              <div className="pdf-row">
                <div className="pdf-label">គោត្តនាម</div>
                <div className="pdf-value">{requesterName}</div>
              </div>
              <div className="pdf-row">
                <div className="pdf-label">លេខទូរស័ព្ទ</div>
                <div className="pdf-value">{renderValue(formData.phone)}</div>
              </div>
              <div className="pdf-row">
                <div className="pdf-label">តួនាទី</div>
                <div className="pdf-value">{renderValue(formData.role)}</div>
              </div>
              <div className="pdf-row">
                <div className="pdf-label">ឯកសារភ្ជាប់</div>
                <div className="pdf-value">{renderValue(supportFileName)}</div>
              </div>
            </section>


          <section className="pdf-panel pdf-panel-full">
            <h3>បញ្ជីសមាជិកចូលរួមបេសកកម្ម</h3>
            {filledMembers.length ? (
              <table className="pdf-member-table">
                <thead>
                  <tr>
                    <th>ល.រ</th>
                    <th>គោត្តនាម</th>
                    <th>លេខទូរស័ព្ទ</th>
                    <th>តួនាទី</th>
                  </tr>
                </thead>
                <tbody>
                  {filledMembers.map((member, index) => (
                    <tr key={`${member.name}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{renderValue(member.name)}</td>
                      <td>{renderValue(member.phone)}</td>
                      <td>{renderValue(member.role)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="pdf-empty-member">មិនមានទិន្នន័យសមាជិកបន្ថែម។</p>
            )}
          </section>

          <section className="pdf-panel pdf-panel-full">
            <h3>សំណូមពរ និងតម្រូវការបន្ថែម</h3>
            <p className="pdf-request-note">{renderValue(formData.requestNote)}</p>
          </section>
          <section className="pdf-panel pdf-panel-full">
              <h3>ព័ត៌មានការអនុម័ត</h3>
              <div className="pdf-row">
                <div className="pdf-label">ស្ថានភាពពិនិត្យ</div>
                <div className={`pdf-value pdf-value-status ${requestStatus}`}>{statusLabel}</div>
              </div>
              <div className="pdf-row">
                <div className="pdf-label">ពិនិត្យដោយ</div>
                <div className="pdf-value">{approvalDisplayText}</div>
              </div>
              <div className="pdf-row">
                <div className="pdf-label">ពេលវេលាពិនិត្យ</div>
                <div className="pdf-value">{formatDateTime(submittedAt)}</div>
              </div>
              <div className="pdf-row">
                <div className="pdf-label">ហត្ថលេខា</div>
                <div className="pdf-signature-line">______________________________</div>
              </div>
            </section>
          </section>
          <footer className="pdf-document-footer">
            <span>បង្កើតដោយប្រព័ន្ធ MCCTV Fleet</span>
            <span>{formatDateTime(submittedAt)}</span>
          </footer>
        </article>
      </div>
    </div>
  );
}









