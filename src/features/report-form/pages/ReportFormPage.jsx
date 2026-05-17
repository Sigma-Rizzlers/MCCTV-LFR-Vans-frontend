import { useEffect, useMemo, useState } from "react";
import { initialReportForm, initialStatusText, reportNavItems } from "../constants/reportFormConfig";
import ReportHeader from "../components/ReportHeader";
import RequestSection from "../components/RequestSection";
import HistorySection from "../components/HistorySection";
import PdfTemplate from "../components/PdfTemplate";
import UserProfileSection from "../components/UserProfileSection";
import "../styles/index.css";
import "../../sys-manager/styles/sysmanager.css";
import { loadUserProfile, saveUserProfile } from "../../../utils/userProfileStorage";
import { loadAdminMissionPanel } from "../../../utils/adminMissionPanel";
import { saveReportFile } from "../../../utils/reportFileStore";
import { saveDraft, loadDraft, clearDraft } from "../../../utils/reportDraftStorage";

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
  if (!normalizedValue) return "";
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
  if (!Array.isArray(members)) return [];
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
  if (!Array.isArray(vehicles)) return [];
  return vehicles
    .map((vehicle) => ({ brand: toText(vehicle?.brand), plate: toText(vehicle?.plate) }))
    .filter((vehicle) => vehicle.brand || vehicle.plate);
}

function sanitizeEquipmentItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({ type: toText(item?.type), quantity: toText(item?.quantity) }))
    .filter((item) => item.type || item.quantity);
}

function sanitizeAdminPanelForReport(rawPanel) {
  if (!rawPanel || typeof rawPanel !== "object") return null;
  return {
    missionTitle: toText(rawPanel.missionTitle),
    missionPlace: toText(rawPanel.missionPlace),
    missionTime: toText(rawPanel.missionTime),
    participantCount: toText(rawPanel.participantCount),
    missionVia: toText(rawPanel.missionVia)
  };
}

function sanitizeReport(rawReport) {
  if (!rawReport || typeof rawReport !== "object") return null;
  const requestId = toText(rawReport.requestId);
  const submittedAt = toText(rawReport.submittedAt);
  if (!requestId || !submittedAt) return null;

  return {
    requestId,
    submittedAt,
    lastEditedAt: toText(rawReport.lastEditedAt),
    formData: sanitizeFormData(rawReport.formData),
    supportFileName: toText(rawReport.supportFileName),
    lodgingImageName: toText(rawReport.lodgingImageName),
    breakfastImageName: toText(rawReport.breakfastImageName),
    lunchImageName: toText(rawReport.lunchImageName),
    dinnerImageName: toText(rawReport.dinnerImageName),
    implementationImageName: toText(rawReport.implementationImageName),
    members: sanitizeMembers(rawReport.members),
    vehicles: sanitizeVehicles(rawReport.vehicles),
    equipmentItems: sanitizeEquipmentItems(rawReport.equipmentItems),
    adminPanel: sanitizeAdminPanelForReport(rawReport.adminPanel),
    submitterUsername: toText(rawReport.submitterUsername),
    editHistory: Array.isArray(rawReport.editHistory) ? rawReport.editHistory : []
  };
}

function loadHistoryFromStorage() {
  if (typeof window === "undefined") return [];
  try {
    const rawValue = window.localStorage.getItem(historyStorageKey);
    if (!rawValue) return [];
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeReport).filter(Boolean).slice(0, maxHistoryEntries);
  } catch (error) {
    console.error(error);
    return [];
  }
}

function saveHistoryToStorage(reports) {
  try {
    window.localStorage.setItem(historyStorageKey, JSON.stringify(reports));
  } catch (error) {
    console.error(error);
  }
}

function getCurrentUsername() {
  if (typeof window === "undefined") return "";
  return String(window.sessionStorage.getItem("mcctv:session-username") ?? "").trim();
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
  const [successInfo, setSuccessInfo] = useState(null);
  const [historyReports, setHistoryReports] = useState(() => loadHistoryFromStorage());
  const [editingReportId, setEditingReportId] = useState(null);
  const [draftToRestore, setDraftToRestore] = useState(() => {
    if (authRole !== "user") return null;
    return loadDraft(getCurrentUsername());
  });
  const [draftSavedAt, setDraftSavedAt] = useState(null);

  const currentUsername = useMemo(getCurrentUsername, []);
  const editingReport = useMemo(
    () => historyReports.find((r) => r.requestId === editingReportId) ?? null,
    [historyReports, editingReportId]
  );
  const myReportsCount = useMemo(
    () => historyReports.filter((r) => !currentUsername || r.submitterUsername === currentUsername).length,
    [historyReports, currentUsername]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    saveHistoryToStorage(historyReports);
  }, [historyReports]);

  // Auto-save draft for user role (debounced 2 s, only when not in edit mode)
  useEffect(() => {
    if (authRole !== "user" || editingReportId) return;
    const hasContent = Object.values(formData).some((v) => String(v ?? "").trim());
    if (!hasContent) return;
    const timer = setTimeout(() => {
      saveDraft(currentUsername, formData);
      setDraftSavedAt(new Date());
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, authRole, editingReportId, currentUsername]);

  function handleChange(event) {
    const { name, value } = event.target;
    let nextValue = value;
    if (name === "travelDuration") {
      nextValue = !value ? "" : String(Math.min(24, Math.max(1, Number(value) || 1)));
    } else if ([
      "vehicleCount", "vehiclePlanCount", "vehicleActualCount",
      "equipmentCount", "equipmentPlanCount", "equipmentActualCount",
      "planCount", "actualCount",
      "meetingParticipantsCount", "meetingParticipantsFemale",
      "lodgingCount", "lodgingFemale",
      "breakfastCount", "breakfastFemale",
      "lunchCount", "lunchFemale",
      "dinnerCount", "dinnerFemale",
      "implementationPlanTotal", "implementationPlanFemale",
      "implementationActualTotal", "implementationActualFemale"
    ].includes(name)) {
      nextValue = !value ? "" : String(Math.min(50, Math.max(0, Number(value) || 0)));
    }
    setFormData((current) => ({ ...current, [name]: nextValue }));
    if (name === "phone") setPhoneError(validatePhone(value));
    if (name === "planCount" || name === "actualCount") setStatusText(initialStatusText);
  }

  function handleOpenProfile() {
    if (activeSection === "profile") return;
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

  function handleOpenMySubmissions() {
    setActiveSection("mysubmissions");
  }

  function handleBackToRequest() {
    setActiveSection("request");
    setProfilePhoneError("");
    setProfileStatusText("");
  }

  function handleSectionChange(nextSection) {
    if (nextSection !== activeSection) setActiveSection(nextSection);
  }

  function handleProfileFieldChange(event) {
    const { name, value } = event.target;
    setProfileDraft((current) => ({ ...current, [name]: value }));
    setProfileStatusText("");
    if (name === "phone") setProfilePhoneError(validatePhone(value));
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
    if (nextPhoneError) { setProfilePhoneError(nextPhoneError); return; }
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

  function handleStartEdit(reportId) {
    const target = historyReports.find((r) => r.requestId === reportId);
    if (!target) return;
    setEditingReportId(reportId);
    setFormData({ ...initialReportForm, ...(target.formData ?? {}) });
    setActiveSection("request");
    setStatusText(initialStatusText);
    setPhoneError("");
  }

  function handleCancelEdit() {
    setEditingReportId(null);
    setFormData({ ...initialReportForm, ...pickProfileFields(savedProfile) });
    setSupportFile(createSupportFileReference(savedProfile));
    setStatusText(initialStatusText);
    setPhoneError("");
  }

  function handleRestoreDraft() {
    if (!draftToRestore?.formData) return;
    setFormData((current) => ({ ...current, ...draftToRestore.formData }));
    setDraftToRestore(null);
    setActiveSection("request");
  }

  function handleDiscardDraft() {
    clearDraft(currentUsername);
    setDraftToRestore(null);
  }

  function handleSubmit(event, payload = {}) {
    event.preventDefault();

    const adminPanel = loadAdminMissionPanel();
    const mergedFormData = adminPanel
      ? {
          ...formData,
          missionTitle: adminPanel.missionTitle || formData.missionTitle,
          missionPlace: adminPanel.missionPlace || formData.missionPlace,
          mission: adminPanel.missionVia || formData.mission
        }
      : formData;

    const now = new Date();

    // ── Edit mode: update existing report in-place ──
    if (editingReportId) {
      const targetIndex = historyReports.findIndex((r) => r.requestId === editingReportId);
      if (targetIndex === -1) return;

      const existing = historyReports[targetIndex];
      const snapshot = {
        editedAt: now.toISOString(),
        formData: existing.formData,
        vehicles: existing.vehicles,
        equipmentItems: existing.equipmentItems
      };
      const updated = {
        ...existing,
        formData: sanitizeFormData(mergedFormData),
        vehicles: sanitizeVehicles(payload.vehicles ?? []),
        equipmentItems: sanitizeEquipmentItems(payload.equipmentItems ?? []),
        members: sanitizeMembers(payload.members ?? existing.members),
        lastEditedAt: now.toISOString(),
        editHistory: [...(existing.editHistory ?? []), snapshot]
      };

      const nextHistory = [...historyReports];
      nextHistory[targetIndex] = updated;
      saveHistoryToStorage(nextHistory);
      setHistoryReports(nextHistory);

      // Save any re-uploaded files to IndexedDB
      const editFileEntries = [
        ["support", supportFile],
        ["lodging", lodgingImage],
        ["breakfast", breakfastImage],
        ["lunch", lunchImage],
        ["dinner", dinnerImage],
        ["implementation", implementationImage]
      ];
      for (const [fieldName, file] of editFileEntries) {
        if (file instanceof Blob) {
          saveReportFile(editingReportId, fieldName, file).catch(console.error);
        }
      }

      setEditingReportId(null);
      setFormData({ ...initialReportForm, ...pickProfileFields(savedProfile) });
      setSupportFile(createSupportFileReference(savedProfile));
      setStatusText(initialStatusText);
      setSuccessInfo({ requestId: editingReportId, report: updated, isEdit: true });
      return;
    }

    // ── New submission ──
    const nextPhoneError = validatePhone(formData.phone);
    if (nextPhoneError) setPhoneError(nextPhoneError);

    const nextReport = sanitizeReport({
      requestId: createRequestId(now),
      submittedAt: now.toISOString(),
      formData: { ...mergedFormData },
      adminPanel,
      submitterUsername: currentUsername,
      supportFileName: supportFile?.name ?? "",
      lodgingImageName: lodgingImage?.name ?? "",
      breakfastImageName: breakfastImage?.name ?? "",
      lunchImageName: lunchImage?.name ?? "",
      dinnerImageName: dinnerImage?.name ?? "",
      implementationImageName: implementationImage?.name ?? "",
      members: payload.members,
      vehicles: payload.vehicles,
      equipmentItems: payload.equipmentItems,
      editHistory: []
    });

    if (!nextReport) return;

    const nextHistoryReports = [nextReport, ...historyReports].slice(0, maxHistoryEntries);
    saveHistoryToStorage(nextHistoryReports);
    setHistoryReports(nextHistoryReports);

    // Save uploaded files to IndexedDB
    const newFileEntries = [
      ["support", supportFile],
      ["lodging", lodgingImage],
      ["breakfast", breakfastImage],
      ["lunch", lunchImage],
      ["dinner", dinnerImage],
      ["implementation", implementationImage]
    ];
    for (const [fieldName, file] of newFileEntries) {
      if (file instanceof Blob) {
        saveReportFile(nextReport.requestId, fieldName, file).catch(console.error);
      }
    }

    clearDraft(currentUsername);
    setDraftSavedAt(null);
    setPhoneError("");
    setStatusText("បានបញ្ជូនសំណើររបស់អ្នកដោយជោគជ័យ");
    setSuccessInfo({ requestId: nextReport.requestId, report: nextReport, isEdit: false });
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

    if (resetStatus) setStatusText(initialStatusText);
    if (clearPhoneError) setPhoneError("");
    if (clearSubmittedReport) setSubmittedReport(null);
  }

  const sharedFormProps = {
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
    hidePersonalFields: true,
    initialVehicles: editingReport?.vehicles ?? null,
    initialEquipmentItems: editingReport?.equipmentItems ?? null,
    editingReportId,
    onCancelEdit: editingReportId ? handleCancelEdit : null
  };

  const sharedOverlays = (
    <>
      {successInfo ? (
        <div className="pdf-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="successTitle">
          <div className="pdf-preview-shell" style={{ maxWidth: "480px", textAlign: "center" }}>
            <div style={{ padding: "2rem 2rem 1.5rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>
                {successInfo.isEdit ? "✏️" : "✅"}
              </div>
              <h2 id="successTitle" style={{ marginBottom: "0.5rem", fontSize: "1.25rem" }}>
                {successInfo.isEdit ? "បានកែប្រែដោយជោគជ័យ!" : "បានបញ្ជូនដោយជោគជ័យ!"}
              </h2>
              <p style={{ color: "#666", marginBottom: "0.25rem", fontSize: "0.9rem" }}>
                {successInfo.isEdit
                  ? "ការកែប្រែសំណើរបស់អ្នកត្រូវបានរក្សាទុក។"
                  : "សំណើរបស់អ្នកត្រូវបានរក្សាទុក និងផ្ញើទៅអ្នកគ្រប់គ្រងរួចរាល់។"}
              </p>
              <p style={{ fontWeight: "600", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                លេខសំណើ៖ {successInfo.requestId}
              </p>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  className="primary"
                  type="button"
                  onClick={() => {
                    setSubmittedReport(successInfo.report);
                    setSuccessInfo(null);
                  }}
                >
                  មើល PDF
                </button>
                <button className="ghost" type="button" onClick={() => setSuccessInfo(null)}>
                  បិទ
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <PdfTemplate report={submittedReport} onClose={() => setSubmittedReport(null)} />
    </>
  );

  // Sidebar layout for authenticated user role
  if (authRole === "user") {
    return (
      <div className="sys-manager-page notranslate" translate="no" lang="km">
        <div className="sys-manager-topbar">
          <div className="sys-manager-brand">
            <img
              src="/ministry-logo.png"
              className="sys-manager-logo"
              alt="Ministry of Interior logo"
              onError={(e) => { e.currentTarget.src = "/logo.png"; }}
            />
            <div>
              <div className="sys-manager-brand-title">ក្រសួងមហាផ្ទៃ</div>
              <div className="sys-manager-brand-sub">MINISTRY OF INTERIOR</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              className="ghost"
              style={{ fontSize: 14 }}
              onClick={onAdminLogout}
            >
              ចាកចេញ
            </button>
          </div>
        </div>

        <div className="sys-manager-body">
          <aside className="sys-manager-sidebar">
            <div className="sys-sidebar-section-label">ម៉ឺនុយ</div>
            <nav className="sys-manager-nav">
              <button
                type="button"
                className={`sys-nav-item ${activeSection === "request" ? "active" : ""}`}
                onClick={() => { setActiveSection("request"); }}
              >
                ការបំពេញសំណើ
              </button>
              <button
                type="button"
                className={`sys-nav-item ${activeSection === "mysubmissions" ? "active" : ""}`}
                onClick={() => setActiveSection("mysubmissions")}
              >
                ការបញ្ជូនរបស់ខ្ញុំ
                {myReportsCount > 0 && (
                  <span className="sys-nav-badge">{myReportsCount}</span>
                )}
              </button>
              <button
                type="button"
                className={`sys-nav-item ${activeSection === "profile" ? "active" : ""}`}
                onClick={handleOpenProfile}
              >
                ព័ត៌មានរបស់ខ្ញុំ
              </button>
            </nav>
          </aside>

          <main className="sys-manager-main">
            {/* Draft restore banner */}
            {draftToRestore && activeSection === "request" && !editingReportId && (
              <div style={{
                marginBottom: 16, padding: "12px 16px",
                background: "#fffbea", border: "2px solid #c89318",
                borderRadius: 12, display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: 12, flexWrap: "wrap"
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#111", fontSize: 14 }}>
                    📝 មានព្រាងដែលបានរក្សាទុក
                  </div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                    រក្សាទុកនៅ {new Date(draftToRestore.savedAt).toLocaleString("km-KH")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="primary" type="button" style={{ fontSize: 13, padding: "7px 16px" }} onClick={handleRestoreDraft}>
                    បន្តការបំពេញ
                  </button>
                  <button className="ghost" type="button" style={{ fontSize: 13, padding: "7px 14px" }} onClick={handleDiscardDraft}>
                    លុបព្រាង
                  </button>
                </div>
              </div>
            )}

            {/* Draft saved indicator */}
            {draftSavedAt && activeSection === "request" && !editingReportId && (
              <div style={{
                marginBottom: 8, padding: "6px 12px",
                background: "#f0faf3", border: "1px solid #b6dfc2",
                borderRadius: 8, fontSize: 12, color: "#2f8d43", display: "inline-flex",
                alignItems: "center", gap: 6
              }}>
                ✓ បានរក្សាទុកព្រាងនៅ {draftSavedAt.toLocaleTimeString("km-KH")}
              </div>
            )}

            <RequestSection
              isActive={activeSection === "request"}
              formKey={editingReportId ?? "new"}
              formProps={sharedFormProps}
            />
            <HistorySection
              isActive={activeSection === "mysubmissions"}
              reports={historyReports}
              currentUsername={currentUsername}
              onOpenPdf={(requestId) => {
                const r = historyReports.find((x) => x.requestId === requestId);
                if (r) setSubmittedReport(r);
              }}
              onStartEdit={handleStartEdit}
            />
            <UserProfileSection
              isActive={activeSection === "profile"}
              savedProfile={savedProfile}
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
        </div>

        {sharedOverlays}
      </div>
    );
  }

  // Default layout for guest / admin / super_admin
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
      />

      <main className="page-main">
        <RequestSection
          isActive={activeSection === "request"}
          formKey={editingReportId ?? "new"}
          formProps={sharedFormProps}
        />
        <UserProfileSection
          isActive={activeSection === "profile"}
          savedProfile={savedProfile}
          profileData={profileDraft}
          phoneError={profilePhoneError}
          statusText={profileStatusText}
          onFieldChange={handleProfileFieldChange}
          onSupportFileChange={handleProfileSupportFileChange}
          onClearSupportFile={handleClearProfileSupportFile}
          onBack={handleBackToRequest}
          onSubmit={handleProfileSubmit}
        />
        <HistorySection
          isActive={activeSection === "mysubmissions"}
          reports={historyReports}
          currentUsername={currentUsername}
          onOpenPdf={(requestId) => {
            const r = historyReports.find((x) => x.requestId === requestId);
            if (r) setSubmittedReport(r);
          }}
          onStartEdit={handleStartEdit}
        />
      </main>

      <footer className="footer">© 2026 អគ្គនាយកដ្ឋានបច្ចេកវិទ្យាឌីជីថល និងផ្សព្វផ្សាយអប់រំ - ប្រព័ន្ធស្នើសុំរថយន្តបេសកកម្ម</footer>

      {sharedOverlays}
    </div>
  );
}
