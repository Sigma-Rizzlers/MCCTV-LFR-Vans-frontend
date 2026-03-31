import { useEffect, useState } from "react";
import "../../report-form/styles/index.css";
import "../../report-form/styles/layout.css";
import "../../report-form/styles/request.css";
import "../../report-form/styles/form.css";
import "../../report-form/styles/responsive.css";
import "../../report-form/styles/pdf.css";
import "../../admin-dashboard/styles/dashboard.css";
import HistorySection from "../../report-form/components/HistorySection";
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
    formData,
    supportFileName: toText(rawReport.supportFileName),
    members: sanitizeMembers(rawReport.members),
    vehicles: Array.isArray(rawReport.vehicles) ? rawReport.vehicles : [],
    equipmentItems: Array.isArray(rawReport.equipmentItems) ? rawReport.equipmentItems : []
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

  return (
    <div className="page admin-dashboard-page notranslate" translate="no" lang="km">
      <header className="topbar">
        <div className="brand">
          <div className="brand-main">
            <div className="seal">
              <img
                className="brand-logo"
                src="/logo.png"
                alt="Ministry of Interior logo"
                onError={(event) => {
                  event.currentTarget.src = "/logo.png";
                }}
              />
            </div>
            <div className="brand-text">
              <div className="brand-title brand-title-kh">ផ្ទាំងគ្រប់គ្រងអ្នកគ្រប់គ្រងជាន់ខ្ពស់</div>
              <div className="brand-title-en brand-title-system">ប្រវត្តិសំណើ</div>
            </div>
          </div>
          <div className="brand-title-en brand-title-sub">ពិនិត្យសំណើដែលបានរក្សាទុកក្នុងប្រព័ន្ធ</div>
        </div>
      </header>

      <nav className="nav admin-dashboard-nav">
        <a href="#history" className="active">
          ប្រវត្តិសំណើ
        </a>
        <div className="admin-actions admin-dashboard-actions-bar">
          {onBackToMain ? (
            <button type="button" className="admin-access-btn admin" onClick={onBackToMain}>
              ទំព័រដើម
            </button>
          ) : null}
          <button type="button" className="admin-access-btn admin" onClick={onLogout}>
            ចាកចេញ
          </button>
        </div>
      </nav>

      <main className="page-main admin-dashboard-main">
        <HistorySection
          isActive
          reports={historyReports}
          onClearHistory={handleClearHistory}
          onOpenPdf={handleOpenPdf}
        />
      </main>

      <PdfTemplate report={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  );
}
