import { useEffect, useState } from "react";
import { initialReportForm, initialStatusText, reportNavItems } from "../constants/reportFormConfig";
import ReportHeader from "../components/ReportHeader";
import RequestSection from "../components/RequestSection";
import PdfTemplate from "../components/PdfTemplate";
import UserProfileSection from "../components/UserProfileSection";
import "../styles/index.css";
import { loadUserProfile, saveUserProfile } from "../../../utils/userProfileStorage";

const cambodiaPhoneRegex = /^(?:0\d{8,9}|0\d{2}-\d{3}-\d{3,4})$/;
const phoneErrorMessage =
  "លេខទូរស័ព្ទមិនត្រឹមត្រូវ។ សូមប្រើ 012-345-678 ឬ 012-345-6789 (9-10 ខ្ទង់)។";
const historyStorageKey = "mcctv:mission-request-history";
const maxHistoryEntries = 100;
const reportFormFields = Object.keys(initialReportForm);
const profileFieldNames = ["name", "phone", "gender", "role"];

function createSupportFileReference(profile) {
  const fileName = toText(profile?.supportFileName || profile?.supportFile?.name);
  return fileName ? { name: fileName } : null;
}

function pickProfileFields(profile) {
  return profileFieldNames.reduce((result, field) => {
    result[field] = toText(profile?.[field]);
    return result;
  }, {});
}

function createProfileDraft(profile) {
  return {
    ...pickProfileFields(profile),
    supportFile: createSupportFileReference(profile)
  };
}

function getInitialUserState() {
  const savedProfile = loadUserProfile();

  return {
    savedProfile,
    profileDraft: createProfileDraft(savedProfile),
    formData: { ...initialReportForm, ...pickProfileFields(savedProfile) },
    supportFile: createSupportFileReference(savedProfile)
  };
}

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
  const [initialUserState] = useState(getInitialUserState);
  const [activeSection, setActiveSection] = useState("request");
  const [savedProfile, setSavedProfile] = useState(initialUserState.savedProfile);
  const [profileDraft, setProfileDraft] = useState(initialUserState.profileDraft);
  const [profilePhoneError, setProfilePhoneError] = useState("");
  const [profileStatusText, setProfileStatusText] = useState("");
  const [formData, setFormData] = useState(initialUserState.formData);
  const [supportFile, setSupportFile] = useState(initialUserState.supportFile);
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
    if (name === "travelDuration") {
      if (!value) {
        nextValue = "";
      } else {
        nextValue = String(Math.min(24, Math.max(1, Number(value) || 1)));
      }
    } else if (
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

    if (name === "planCount" || name === "actualCount") {
      setStatusText(initialStatusText);
    }
  }

  function handleOpenProfile() {
    if (activeSection === "profile") {
      return;
    }

    const nextDraft = {
      name: toText(formData.name) || savedProfile.name,
      phone: toText(formData.phone) || savedProfile.phone,
      gender: toText(formData.gender) || savedProfile.gender,
      role: toText(formData.role) || savedProfile.role,
      supportFile: supportFile || createSupportFileReference(savedProfile)
    };

    setProfileDraft(nextDraft);
    setProfilePhoneError(validatePhone(nextDraft.phone));
    setProfileStatusText("");
    setActiveSection("profile");
  }

  function handleBackToRequest() {
    setActiveSection("request");
    setProfilePhoneError("");
    setProfileStatusText("");
  }

  function handleSectionChange(nextSection) {
    if (nextSection === activeSection) {
      return;
    }

    setActiveSection(nextSection);
  }

  function handleProfileFieldChange(event) {
    const { name, value } = event.target;

    setProfileDraft((current) => ({ ...current, [name]: value }));
    setProfileStatusText("");

    if (name === "phone") {
      setProfilePhoneError(validatePhone(value));
    }
  }

  function handleProfileSupportFileChange(file) {
    setProfileDraft((current) => ({ ...current, supportFile: file }));
    setProfileStatusText("");
  }

  function handleClearProfileSupportFile() {
    setProfileDraft((current) => ({ ...current, supportFile: null }));
    setProfileStatusText("");
  }

  function handleProfileSubmit(event) {
    event.preventDefault();

    const nextPhoneError = validatePhone(profileDraft.phone);
    if (nextPhoneError) {
      setProfilePhoneError(nextPhoneError);
      return;
    }

    const nextSavedProfile = saveUserProfile({
      ...profileDraft,
      supportFileName: profileDraft.supportFile?.name ?? ""
    });
    const nextSupportFile = profileDraft.supportFile || createSupportFileReference(nextSavedProfile);

    setSavedProfile(nextSavedProfile);
    setProfileDraft(createProfileDraft(nextSavedProfile));
    setFormData((current) => ({ ...current, ...pickProfileFields(nextSavedProfile) }));
    setSupportFile(nextSupportFile);
    setPhoneError("");
    setProfilePhoneError("");
    setProfileStatusText("បានរក្សាទុកព័ត៌មានផ្ទាល់ខ្លួនរួចរាល់");
  }

  function handleSubmit(event, payload = {}) {
    event.preventDefault();

    const nextProfilePhoneError = validatePhone(formData.phone);
    const isProfileMissing =
      !toText(formData.name) ||
      !toText(formData.phone) ||
      !toText(formData.gender) ||
      !toText(formData.role);

    if (isProfileMissing || nextProfilePhoneError) {
      const nextDraft = {
        name: toText(formData.name) || savedProfile.name,
        phone: toText(formData.phone) || savedProfile.phone,
        gender: toText(formData.gender) || savedProfile.gender,
        role: toText(formData.role) || savedProfile.role,
        supportFile: supportFile || createSupportFileReference(savedProfile)
      };

      setProfileDraft(nextDraft);
      setProfilePhoneError(nextProfilePhoneError);
      setProfileStatusText("សូមបំពេញព័ត៌មានផ្ទាល់ខ្លួនជាមុនសិន");
      setActiveSection("profile");
      return;
    }

    const now = new Date();
    const nextReport = sanitizeReport({
      requestId: createRequestId(now),
      submittedAt: now.toISOString(),
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
    setStatusText("បានបញ្ជូនសំណើររបស់អ្នកដោយជោគជ័យ");
  }

  function handleReset(fieldNames = null, options = {}) {
    const isPartialReset = Array.isArray(fieldNames);
    const {
      clearPhoneError = !isPartialReset,
      clearSubmittedReport = !isPartialReset,
      resetStatus = !isPartialReset
    } = options;

    if (isPartialReset) {
      setFormData((current) => {
        const next = { ...current };

        fieldNames.forEach((fieldName) => {
          if (Object.prototype.hasOwnProperty.call(initialReportForm, fieldName)) {
            next[fieldName] = initialReportForm[fieldName];
          }
        });

        return next;
      });
    } else {
      setFormData({ ...initialReportForm, ...pickProfileFields(savedProfile) });
      setSupportFile(createSupportFileReference(savedProfile));
      setLodgingImage(null);
      setBreakfastImage(null);
      setLunchImage(null);
      setDinnerImage(null);
      setImplementationImage(null);
    }

    if (resetStatus) {
      setStatusText(initialStatusText);
    }

    if (clearPhoneError) {
      setPhoneError("");
    }

    if (clearSubmittedReport) {
      setSubmittedReport(null);
    }
  }

  return (
    <div className="page report-page notranslate" translate="no" lang="km">
      <ReportHeader
        activeSection={activeSection}
        navItems={reportNavItems}
        onSectionChange={handleSectionChange}
        authRole={authRole}
        onAdminLogin={onAdminLogin}
        onAdminLogout={onAdminLogout}
        onOpenAdminDashboard={onOpenAdminDashboard}
        onOpenProfile={authRole === "user" ? handleOpenProfile : undefined}
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
            hideMissionSection: true,
            hidePersonalFields: true
          }}
        />
        <UserProfileSection
          isActive={activeSection === "profile"}
          profileData={profileDraft}
          phoneError={profilePhoneError}
          statusText={profileStatusText}
          onFieldChange={handleProfileFieldChange}
          onSupportFileChange={handleProfileSupportFileChange}
          onClearSupportFile={handleClearProfileSupportFile}
          onBack={handleBackToRequest}
          onSubmit={handleProfileSubmit}
        />
      </main>

      <footer className="footer">© 2026 អគ្គនាយកដ្ឋានបច្ចេកវិទ្យាឌីជីថល និងផ្សព្វផ្សាយអប់រំ - ប្រព័ន្ធស្នើសុំរថយន្តបេសកកម្ម</footer>
      <PdfTemplate report={submittedReport} onClose={() => setSubmittedReport(null)} />
    </div>
  );
}
