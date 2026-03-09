import { useEffect, useState } from "react";
import "../../report-form/styles/index.css";
import "../../report-form/styles/layout.css";
import "../../report-form/styles/request.css";
import "../../report-form/styles/form.css";
import "../../report-form/styles/responsive.css";
import "../../report-form/styles/pdf.css";
import "../../admin-dashboard/styles/dashboard.css";
import { getRequestStatus } from "../../report-form/constants/requestStatus";
import HistorySection from "../../report-form/components/HistorySection";
import ApprovalSection from "../../report-form/components/ApprovalSection";
import PdfTemplate from "../../report-form/components/PdfTemplate";

const historyStorageKey = "mcctv:mission-request-history";
const maxHistoryEntries = 100;

function toText(value) {
  return String(value ?? "").trim();
}

function sanitizeMembers(members) {
  if (!Array.isArray(members)) {
    return [];
  }

  return members
    .map((member) => ({
      name: toText(member?.name),
      phone: toText(member?.phone),
      gender: toText(member?.gender),
      role: toText(member?.role),
      supportFileName: toText(member?.supportFileName || member?.supportFile?.name)
    }))
    .filter((member) => member.name || member.phone || member.gender || member.role);
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

  const rawFormData = rawReport.formData && typeof rawReport.formData === "object" ? rawReport.formData : {};
  const formData = Object.keys(rawFormData).reduce((result, key) => {
    result[key] = toText(rawFormData[key]);
    return result;
  }, {});

  return {
    requestId,
    submittedAt,
    approvalStatus: getRequestStatus(rawReport.approvalStatus),
    formData,
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

export default function SuperAdminDashboardPage({ onBackToMain, onLogout }) {
  const [activeSection, setActiveSection] = useState("history");
  const [historyReports, setHistoryReports] = useState(() => loadHistoryFromStorage());
  const [selectedReport, setSelectedReport] = useState(null);

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

  function handleClearHistory() {
    setHistoryReports([]);
  }

  function handleOpenPdf(requestId) {
    const report = historyReports.find((item) => item.requestId === requestId);
    if (!report) {
      return;
    }

    setSelectedReport(report);
  }

  function handleUpdateApprovalStatus(requestId, nextStatus) {
    const normalizedStatus = getRequestStatus(nextStatus);
    setHistoryReports((current) =>
      current.map((report) =>
        report.requestId === requestId ? { ...report, approvalStatus: normalizedStatus } : report
      )
    );
    setSelectedReport((current) =>
      current && current.requestId === requestId ? { ...current, approvalStatus: normalizedStatus } : current
    );
  }

  return (
    <div className="page admin-dashboard-page notranslate" translate="no" lang="km">
      <header className="topbar">
        <div className="brand">
          <div className="brand-main">
            <div className="seal">
              <img className="brand-logo" src="/mcctv-logo.jpg" alt="MCCTV logo" />
            </div>
            <div className="brand-text">
              <div className="brand-title brand-title-kh">Super Admin Dashboard</div>
              <div className="brand-title-en brand-title-system">History and Approval Control</div>
            </div>
          </div>
          <div className="brand-title-en brand-title-sub">Review requests and manage approvals</div>
        </div>
      </header>

      <nav className="nav admin-dashboard-nav">
        <a
          href="#history"
          className={activeSection === "history" ? "active" : ""}
          onClick={(event) => {
            event.preventDefault();
            setActiveSection("history");
          }}
        >
          ប្រវត្តិសំណើ
        </a>
        <a
          href="#approval"
          className={activeSection === "approval" ? "active" : ""}
          onClick={(event) => {
            event.preventDefault();
            setActiveSection("approval");
          }}
        >
          ការអនុម័ត
        </a>
        <div className="admin-actions admin-dashboard-actions-bar">
          <button type="button" className="admin-access-btn admin" onClick={onBackToMain}>
            Main Page
          </button>
          <button type="button" className="admin-access-btn admin" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>

      <main className="page-main admin-dashboard-main">
        <HistorySection
          isActive={activeSection === "history"}
          reports={historyReports}
          onClearHistory={handleClearHistory}
          onOpenPdf={handleOpenPdf}
        />
        <ApprovalSection
          isActive={activeSection === "approval"}
          reports={historyReports}
          onUpdateStatus={handleUpdateApprovalStatus}
          onOpenPdf={handleOpenPdf}
        />
      </main>

      <PdfTemplate report={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  );
}
