import { useState } from "react";
import { initialReportForm, initialStatusText, reportNavItems } from "../constants/reportFormConfig";
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

export default function ReportFormPage() {
  const [activeSection, setActiveSection] = useState("request");
  const [formData, setFormData] = useState(initialReportForm);
  const [supportFile, setSupportFile] = useState(null);
  const [statusText, setStatusText] = useState(initialStatusText);
  const [phoneError, setPhoneError] = useState("");
  const [submittedReport, setSubmittedReport] = useState(null);

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
    const members = Array.isArray(payload.members)
      ? payload.members.filter((member) =>
          [member.name, member.phone, member.role].some((value) => String(value ?? "").trim())
        )
      : [];

    setSubmittedReport({
      requestId: createRequestId(now),
      submittedAt: now.toISOString(),
      formData: { ...formData },
      supportFileName: supportFile?.name ?? "",
      members
    });

    setPhoneError("");
    setStatusText("បានបញ្ជូនសំណើរបស់អ្នកដោយជោគជ័យ");
  }

  function handleReset() {
    setFormData(initialReportForm);
    setSupportFile(null);
    setStatusText(initialStatusText);
    setPhoneError("");
    setSubmittedReport(null);
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
        <HistorySection isActive={activeSection === "history"} />
        <ApprovalSection isActive={activeSection === "approval"} />
        <PolicySection isActive={activeSection === "policy"} />
      </main>

      <footer className="footer">© 2026 អង្គភាពប្រតិបត្តិការ MCCTV - ប្រព័ន្ធស្នើសុំរថយន្តបេសកកម្ម</footer>
      <PdfTemplate report={submittedReport} onClose={() => setSubmittedReport(null)} />
    </div>
  );
}



