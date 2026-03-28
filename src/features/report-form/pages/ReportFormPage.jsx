import { useEffect, useState } from "react";
import { initialReportForm, initialStatusText, reportNavItems } from "../constants/reportFormConfig";
import { getRequestStatus } from "../constants/requestStatus";
import ReportHeader from "../components/ReportHeader";
import RequestSection from "../components/RequestSection";
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
      const gender = toText(member?.gender);
      const role = toText(member?.role);
      const supportFileName = toText(member?.supportFileName || member?.supportFile?.name);
      return { name, phone, gender, role, supportFileName };
    })
    .filter((member) => member.name || member.phone || member.gender || member.role);
}

function sanitizeVehicles(vehicles) {
  if (!Array.isArray(vehicles)) {
    return [];
  }

  return vehicles
    .map((vehicle) => ({
      brand: toText(vehicle?.brand),
      plate: toText(vehicle?.plate)
    }))
    .filter((vehicle) => vehicle.brand || vehicle.plate);
}

function sanitizeEquipmentItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      type: toText(item?.type),
      quantity: toText(item?.quantity)
    }))
    .filter((item) => item.type || item.quantity);
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
    lodgingImageName: toText(rawReport.lodgingImageName),
    breakfastImageName: toText(rawReport.breakfastImageName),
    lunchImageName: toText(rawReport.lunchImageName),
    dinnerImageName: toText(rawReport.dinnerImageName),
    implementationImageName: toText(rawReport.implementationImageName),
    members: sanitizeMembers(rawReport.members),
    vehicles: sanitizeVehicles(rawReport.vehicles),
    equipmentItems: sanitizeEquipmentItems(rawReport.equipmentItems)
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

export default function ReportFormPage({
  authRole = "guest",
  onAdminLogin,
  onAdminLogout,
  onOpenAdminDashboard
}) {
  const [activeSection, setActiveSection] = useState("request");
  const [formData, setFormData] = useState(initialReportForm);
  const [supportFile, setSupportFile] = useState(null);
  const [lodgingImage, setLodgingImage] = useState(null);
  const [breakfastImage, setBreakfastImage] = useState(null);
  const [lunchImage, setLunchImage] = useState(null);
  const [dinnerImage, setDinnerImage] = useState(null);
  const [implementationImage, setImplementationImage] = useState(null);
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
    let nextValue = value;
    if (
      name === "vehicleCount" ||
      name === "vehiclePlanCount" ||
      name === "vehicleActualCount" ||
      name === "equipmentCount" ||
      name === "equipmentPlanCount" ||
      name === "equipmentActualCount" ||
      name === "planCount" ||
      name === "actualCount" ||
      name === "meetingParticipantsCount" ||
      name === "meetingParticipantsFemale" ||
      name === "lodgingCount" ||
      name === "lodgingFemale" ||
      name === "breakfastCount" ||
      name === "breakfastFemale" ||
      name === "lunchCount" ||
      name === "lunchFemale" ||
      name === "dinnerCount" ||
      name === "dinnerFemale" ||
      name === "implementationPlanTotal" ||
      name === "implementationPlanFemale" ||
      name === "implementationActualTotal" ||
      name === "implementationActualFemale"
    ) {
      if (!value) {
        nextValue = "";
      } else {
        nextValue = String(Math.min(50, Math.max(0, Number(value) || 0)));
      }
    }

    setFormData((current) => ({ ...current, [name]: nextValue }));

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
      lodgingImageName: lodgingImage?.name ?? "",
      breakfastImageName: breakfastImage?.name ?? "",
      lunchImageName: lunchImage?.name ?? "",
      dinnerImageName: dinnerImage?.name ?? "",
      implementationImageName: implementationImage?.name ?? "",
      members: payload.members,
      vehicles: payload.vehicles,
      equipmentItems: payload.equipmentItems
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
    setLodgingImage(null);
    setBreakfastImage(null);
    setLunchImage(null);
    setDinnerImage(null);
    setImplementationImage(null);
    setStatusText(initialStatusText);
    setPhoneError("");
    setSubmittedReport(null);
  }

  return (
    <div className="page notranslate" translate="no" lang="km">
      <ReportHeader
        activeSection={activeSection}
        navItems={reportNavItems}
        onSectionChange={setActiveSection}
        authRole={authRole}
        onAdminLogin={onAdminLogin}
        onAdminLogout={onAdminLogout}
        onOpenAdminDashboard={onOpenAdminDashboard}
      />

      <main className="page-main">
        <RequestSection
          isActive={activeSection === "request"}
          formProps={{
            formData,
            supportFile,
            lodgingImage,
            breakfastImage,
            lunchImage,
            dinnerImage,
            implementationImage,
            statusText,
            onChange: handleChange,
            onSubmit: handleSubmit,
            onReset: handleReset,
            onSupportFileChange: setSupportFile,
            onLodgingImageChange: setLodgingImage,
            onBreakfastImageChange: setBreakfastImage,
            onLunchImageChange: setLunchImage,
            onDinnerImageChange: setDinnerImage,
            onImplementationImageChange: setImplementationImage,
            phoneError,
            hideMissionSection: true
          }}
        />
      </main>

      <footer className="footer">© 2026 អគ្គនាយកដ្ឋានបច្ចេកវិទ្យាឌីជីថល និងផ្សព្វផ្សាយអប់រំ - ប្រព័ន្ធស្នើសុំរថយន្តបេសកកម្ម</footer>
      <PdfTemplate report={submittedReport} onClose={() => setSubmittedReport(null)} />
    </div>
  );
}
