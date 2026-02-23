import { useEffect, useState } from "react";
import { initialReportForm, initialStatusText, reportNavItems } from "../constants/reportFormConfig";
import { getRequestStatus } from "../constants/requestStatus";
import ReportHeader from "../components/ReportHeader";
import RequestSection from "../components/RequestSection";
import HistorySection from "../components/HistorySection";
import ApprovalSection from "../components/ApprovalSection";
import PolicySection from "../components/PolicySection";
import PdfTemplate from "../components/PdfTemplate";
import "../styles/index.css";

const cambodiaPhoneRegex = /^(?:0\d{8,9}|0\d{2}-\d{3}-\d{3,4})$/;
const phoneErrorMessage =
  "លេខទូរស័ព្ទមិនត្រឹមត្រូវ។ សូមប្រើ 012-345-678 ឬ 012-345-6789 (9-10 ខ្ទង់)។";
const historyStorageKey = "mcctv:mission-request-history";
const maxHistoryEntries = 100;
const reportFormFields = Object.keys(initialReportForm);

function createRequestId(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  const suffix = String(Math.floor(Math.random() * 900) + 100);
  return `REQ-${year}${month}${day}-${hour}${minute}${second}${suffix}`;
}

function validatePhone(value) {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return "";
  }

  return cambodiaPhoneRegex.test(normalizedValue) ? "" : phoneErrorMessage;
}

function toText(value) {
  return String(value ?? "").trim();
}

function sanitizeFormData(formData) {
  return reportFormFields.reduce((result, field) => {
    result[field] = toText(formData?.[field]);
    return result;
  }, {});
}

function sanitizeMembers(members) {
  if (!Array.isArray(members)) {
    return [];
  }

  return members
    .map((member) => {
      const name = toText(member?.name);
      const phone = toText(member?.phone);
      const role = toText(member?.role);
      const supportFileName = toText(member?.supportFileName || member?.supportFile?.name);
      return { name, phone, role, supportFileName };
    })
    .filter((member) => member.name || member.phone || member.role);
}

function sanitizeReport(rawReport) {
  if (!rawReport || typeof rawReport !== "object") {
    return null;
  }

  const requestId = toText(rawReport.requestId);
  const submittedAt = toText(rawReport.submittedAt);
  if (!requestId || !submittedAt) {
    return null;
  }

  return {
    requestId,
    submittedAt,
    approvalStatus: getRequestStatus(rawReport.approvalStatus),
    formData: sanitizeFormData(rawReport.formData),
    supportFileName: toText(rawReport.supportFileName),
    members: sanitizeMembers(rawReport.members)
  };
}

function loadHistoryFromStorage() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(historyStorageKey);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(sanitizeReport).filter(Boolean).slice(0, maxHistoryEntries);
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default function ReportFormPage() {
  const [activeSection, setActiveSection] = useState("request");
  const [formData, setFormData] = useState(initialReportForm);
  const [supportFile, setSupportFile] = useState(null);
  const [statusText, setStatusText] = useState(initialStatusText);
  const [phoneError, setPhoneError] = useState("");
  const [submittedReport, setSubmittedReport] = useState(null);
  const [historyReports, setHistoryReports] = useState(() => loadHistoryFromStorage());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(historyStorageKey, JSON.stringify(historyReports));
    } catch (error) {
      console.error(error);
    }
  }, [historyReports]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));

    if (name === "phone") {
      setPhoneError(validatePhone(value));
    }
  }

  function handleSubmit(event, payload = {}) {
    event.preventDefault();

    const nextPhoneError = validatePhone(formData.phone);
    if (nextPhoneError) {
      setPhoneError(nextPhoneError);
      return;
    }

    const now = new Date();
    const nextReport = sanitizeReport({
      requestId: createRequestId(now),
      submittedAt: now.toISOString(),
      approvalStatus: "pending",
      formData: { ...formData },
      supportFileName: supportFile?.name ?? "",
      members: payload.members
    });

    if (!nextReport) {
      return;
    }

    setSubmittedReport(nextReport);
    setHistoryReports((current) => [nextReport, ...current].slice(0, maxHistoryEntries));

    setPhoneError("");
    setStatusText("បានបញ្ជូនសំណើរបស់អ្នកដោយជោគជ័យ ហើយកំពុងរង់ចាំការអនុម័ត");
  }

  function handleReset() {
    setFormData(initialReportForm);
    setSupportFile(null);
    setStatusText(initialStatusText);
    setPhoneError("");
    setSubmittedReport(null);
  }

  function handleClearHistory() {
    setHistoryReports([]);
  }

  function handleOpenHistoryPdf(requestId) {
    const selectedReport = historyReports.find((report) => report.requestId === requestId);
    if (!selectedReport) {
      return;
    }

    setSubmittedReport(selectedReport);
  }

  function handleUpdateApprovalStatus(requestId, nextStatus) {
    const normalizedStatus = getRequestStatus(nextStatus);
    setHistoryReports((current) =>
      current.map((report) =>
        report.requestId === requestId ? { ...report, approvalStatus: normalizedStatus } : report
      )
    );
    setSubmittedReport((current) =>
      current && current.requestId === requestId ? { ...current, approvalStatus: normalizedStatus } : current
    );
  }

  return (
    <div className="page notranslate" translate="no" lang="km">
      <ReportHeader activeSection={activeSection} navItems={reportNavItems} onSectionChange={setActiveSection} />

      <main className="page-main">
        <RequestSection
          isActive={activeSection === "request"}
          formProps={{
            formData,
            supportFile,
            statusText,
            onChange: handleChange,
            onSubmit: handleSubmit,
            onReset: handleReset,
            onSupportFileChange: setSupportFile,
            phoneError
          }}
        />
        <HistorySection
          isActive={activeSection === "history"}
          reports={historyReports}
          onClearHistory={handleClearHistory}
          onOpenPdf={handleOpenHistoryPdf}
        />
        <ApprovalSection
          isActive={activeSection === "approval"}
          reports={historyReports}
          onUpdateStatus={handleUpdateApprovalStatus}
          onOpenPdf={handleOpenHistoryPdf}
        />
        <PolicySection isActive={activeSection === "policy"} />
      </main>

      <footer className="footer">© 2026 អង្គភាពប្រតិបត្តិការ MCCTV - ប្រព័ន្ធស្នើសុំរថយន្តបេសកកម្ម</footer>
      <PdfTemplate report={submittedReport} onClose={() => setSubmittedReport(null)} />
    </div>
  );
}
