import { useState } from "react";
import { initialReportForm, initialStatusText, reportNavItems } from "../constants/reportFormConfig";
import ReportHeader from "../components/ReportHeader";
import RequestSection from "../components/RequestSection";
import HistorySection from "../components/HistorySection";
import ApprovalSection from "../components/ApprovalSection";
import PolicySection from "../components/PolicySection";
import PdfTemplate from "../components/PdfTemplate";
import "../styles/index.css";

export default function ReportFormPage() {
  const [activeSection, setActiveSection] = useState("request");
  const [formData, setFormData] = useState(initialReportForm);
  const [supportFile, setSupportFile] = useState(null);
  const [statusText, setStatusText] = useState(initialStatusText);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setStatusText("បានបញ្ជូនសំណើរបស់អ្នកដោយជោគជ័យ");
  }

  function handleReset() {
    setFormData(initialReportForm);
    setSupportFile(null);
    setStatusText(initialStatusText);
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
            onSupportFileChange: setSupportFile
          }}
        />
        <HistorySection isActive={activeSection === "history"} />
        <ApprovalSection isActive={activeSection === "approval"} />
        <PolicySection isActive={activeSection === "policy"} />
      </main>

      <footer className="footer">© 2026 អង្គភាពប្រតិបត្តិការ MCCTV - ប្រព័ន្ធស្នើសុំរថយន្តបេសកកម្ម</footer>
      <PdfTemplate />
    </div>
  );
}





