import { useRef, useState } from "react";

const MEMBER_LIMIT = 49;
const VEHICLE_LIMIT = 30;
const EQUIPMENT_LIMIT = 30;
const memberPhoneRegex = /^(?:0\d{8,9}|0\d{2}-\d{3}-\d{3,4})$/;
const standardPlateRegex = /^2[A-Z]{2}-\d{4}$/;
const emptyMemberError = { name: "", phone: "", gender: "", role: "" };
const emptyVehicleError = { brand: "", plate: "" };

function filterPlateValue(value, plateType) {
  if (plateType === "cambodia") {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  }
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 8);
}

function getPlateError(plate, plateType) {
  if (!plate.trim()) return "";
  if (plateType === "standard") {
    return standardPlateRegex.test(plate) ? "" : "ស្លាក់លេខត្រូវជា 2XX-XXXX (ឧ. 2AB-1234)";
  }
  return /^[A-Z0-9]{1,8}$/.test(plate) ? "" : "ស្លាក់លេខអតិបរមា 8 តួ (អក្សរ និងលេខ)";
}
const emptyEquipmentError = { type: "", quantity: "" };
const stepOneMissionFieldNames = ["missionTitle", "departureDate", "returnDate", "missionPlace", "mission"];
const stepOneProfileFieldNames = ["name", "phone", "gender", "role"];
const stepOneForceFieldNames = ["planCount", "actualCount"];
const stepOnePersonalFieldNames = [...stepOneProfileFieldNames, ...stepOneForceFieldNames];
const stepOneTransportFieldNames = [
  "vehicleBrand",
  "vehiclePlate",
  "vehicleCount",
  "vehiclePlanCount",
  "vehicleActualCount"
];
const stepTwoFieldNames = [
  "equipmentType",
  "equipmentCount",
  "equipmentPlanCount",
  "equipmentActualCount",
  "departDate",
  "arriveDate",
  "routeDistance",
  "travelDuration"
];
const stepFourFieldNames = [
  "meetingParticipantsCount",
  "meetingParticipantsFemale",
  "meetingStartTime",
  "meetingEndTime",
  "lodgingPlace",
  "lodgingCount",
  "lodgingFemale"
];
const mealSectionFieldNames = {
  breakfast: ["breakfastPlace", "breakfastCount", "breakfastFemale", "breakfastPaymentUnit", "breakfastSponsor"],
  lunch: ["lunchPlace", "lunchCount", "lunchFemale", "lunchPaymentUnit", "lunchSponsor"],
  dinner: ["dinnerPlace", "dinnerCount", "dinnerFemale", "dinnerPaymentUnit", "dinnerSponsor"]
};
const stepSixFieldNames = [
  "implementationPlanTotal",
  "implementationPlanFemale",
  "implementationActualTotal",
  "implementationActualFemale",
  "implementationDurationCheck",
  "implementationDurationManage",
  "returnDepartTime",
  "returnArriveTime",
  "returnSafetyStatus",
  "returnIssue"
];

function createEmptyMember() {
  return {
    name: "",
    phone: "",
    gender: "",
    role: "",
    supportFile: null
  };
}

function createMemberList() {
  return Array.from({ length: MEMBER_LIMIT }, () => createEmptyMember());
}

function createEmptyVehicle() {
  return { brand: "", plate: "", plateType: "" };
}

function createVehicleList() {
  return Array.from({ length: VEHICLE_LIMIT }, () => createEmptyVehicle());
}

function createEmptyEquipment() {
  return {
    type: "",
    quantity: ""
  };
}

function createEquipmentList() {
  return Array.from({ length: EQUIPMENT_LIMIT }, () => createEmptyEquipment());
}

function isMemberFilled(member) {
  const normalizedPhone = member.phone.trim();
  return Boolean(member.name.trim() && member.gender.trim() && member.role.trim() && memberPhoneRegex.test(normalizedPhone));
}

function isVehicleFilled(vehicle) {
  return Boolean(vehicle.brand.trim() && vehicle.plate.trim());
}

function isEquipmentFilled(equipment) {
  return Boolean(equipment.type.trim() && String(equipment.quantity ?? "").trim());
}

function getFilledVehicles(vehicles) {
  return vehicles.reduce((filledVehicles, vehicle, index) => {
    if (!isVehicleFilled(vehicle)) {
      return filledVehicles;
    }

    filledVehicles.push({
      index,
      brand: vehicle.brand.trim(),
      plate: vehicle.plate.trim()
    });
    return filledVehicles;
  }, []);
}

function getFilledEquipmentItems(equipmentItems) {
  return equipmentItems.reduce((filledItems, equipment, index) => {
    if (!isEquipmentFilled(equipment)) {
      return filledItems;
    }

    filledItems.push({
      index,
      type: equipment.type.trim(),
      quantity: String(equipment.quantity ?? "").trim()
    });
    return filledItems;
  }, []);
}

function validateMember(member) {
  const errors = { ...emptyMemberError };
  const normalizedPhone = member.phone.trim();

  if (!member.name.trim()) {
    errors.name = "សូមបញ្ចូលគោត្តនាមសមាជិក។";
  }

  if (!normalizedPhone) {
    errors.phone = "សូមបញ្ចូលលេខទូរស័ព្ទសមាជិក។";
  } else if (!memberPhoneRegex.test(normalizedPhone)) {
    errors.phone = "លេខទូរស័ព្ទមិនត្រឹមត្រូវ។ សូមប្រើ 012-345-678 ឬ 012-345-6789។";
  }

  if (!member.role.trim()) {
    errors.role = "សូមបញ្ចូលតួនាទីសមាជិក។";
  }

  if (!member.gender.trim()) {
    errors.gender = "Please select member gender.";
  }

  return errors;
}

function hasMemberError(errors) {
  return Object.values(errors).some(Boolean);
}

function clearInputValue(inputRef) {
  if (inputRef.current) {
    inputRef.current.value = "";
  }
}

export default function MissionRequestForm({
  formData,
  supportFile,
  lodgingImage,
  breakfastImage,
  lunchImage,
  dinnerImage,
  implementationImage,
  statusText,
  onChange,
  onSubmit,
  onReset,
  onSupportFileChange,
  onLodgingImageChange,
  onBreakfastImageChange,
  onLunchImageChange,
  onDinnerImageChange,
  onImplementationImageChange,
  phoneError,
  missionPanelContent = null,
  hideMissionSection = false,
  hidePersonalFields = false,
  initialVehicles = null,
  initialEquipmentItems = null,
  editingReportId = null,
  onCancelEdit = null,
  submitDisabled = false,
}) {
  const [activeStep, setActiveStep] = useState(1);
  const [activeMealSection, setActiveMealSection] = useState("breakfast");
  const [mealStepError, setMealStepError] = useState("");
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [activeMemberIndex, setActiveMemberIndex] = useState(0);
  const [members, setMembers] = useState(() => createMemberList());
  const [memberErrors, setMemberErrors] = useState(emptyMemberError);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [activeVehicleIndex, setActiveVehicleIndex] = useState(0);
  const [vehicles, setVehicles] = useState(() => {
    const list = createVehicleList();
    if (Array.isArray(initialVehicles)) {
      initialVehicles.forEach((v, i) => {
        if (i < VEHICLE_LIMIT) list[i] = { brand: String(v?.brand ?? ""), plate: String(v?.plate ?? ""), plateType: "" };
      });
    }
    return list;
  });
  const [vehicleErrors, setVehicleErrors] = useState(emptyVehicleError);
  const [vehiclePlateType, setVehiclePlateType] = useState("");
  const [vehiclePlateError, setVehiclePlateError] = useState("");
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [activeEquipmentIndex, setActiveEquipmentIndex] = useState(0);
  const [equipmentItems, setEquipmentItems] = useState(() => {
    const list = createEquipmentList();
    if (Array.isArray(initialEquipmentItems)) {
      initialEquipmentItems.forEach((e, i) => {
        if (i < EQUIPMENT_LIMIT) list[i] = { type: String(e?.type ?? ""), quantity: String(e?.quantity ?? "") };
      });
    }
    return list;
  });
  const [equipmentErrors, setEquipmentErrors] = useState(emptyEquipmentError);
  const supportFileInputRef = useRef(null);
  const memberSupportFileInputRef = useRef(null);
  const lodgingImageInputRef = useRef(null);
  const breakfastImageInputRef = useRef(null);
  const lunchImageInputRef = useRef(null);
  const dinnerImageInputRef = useRef(null);
  const implementationImageInputRef = useRef(null);
  const mealSections = [
    {
      id: "breakfast",
      optionLabel: "អាហាព្រឹក",
      title: "ការបរិភោគអាហារព្រឹក",
      placeName: "breakfastPlace",
      countName: "breakfastCount",
      femaleName: "breakfastFemale",
      paymentUnitName: "breakfastPaymentUnit",
      sponsorName: "breakfastSponsor",
      imageId: "breakfastImage",
      image: breakfastImage,
      imageInputRef: breakfastImageInputRef,
      onImageChange: onBreakfastImageChange,
      onClearImage: handleClearBreakfastImage
    },
    {
      id: "lunch",
      optionLabel: "ថ្ងៃ",
      title: "ការបរិភោគអាហារថ្ងៃ",
      placeName: "lunchPlace",
      countName: "lunchCount",
      femaleName: "lunchFemale",
      paymentUnitName: "lunchPaymentUnit",
      sponsorName: "lunchSponsor",
      imageId: "lunchImage",
      image: lunchImage,
      imageInputRef: lunchImageInputRef,
      onImageChange: onLunchImageChange,
      onClearImage: handleClearLunchImage
    },
    {
      id: "dinner",
      optionLabel: "ល្ងាច",
      title: "ការបរិភោគអាហារល្ងាច",
      placeName: "dinnerPlace",
      countName: "dinnerCount",
      femaleName: "dinnerFemale",
      paymentUnitName: "dinnerPaymentUnit",
      sponsorName: "dinnerSponsor",
      imageId: "dinnerImage",
      image: dinnerImage,
      imageInputRef: dinnerImageInputRef,
      onImageChange: onDinnerImageChange,
      onClearImage: handleClearDinnerImage
    }
  ];
  const activeMealConfig = mealSections.find((section) => section.id === activeMealSection) ?? mealSections[0];
  const stepOneVisibleFieldNames = hidePersonalFields ? stepOneForceFieldNames : stepOnePersonalFieldNames;
  const stepOneFieldNames = hideMissionSection
    ? [...stepOneVisibleFieldNames, ...stepOneTransportFieldNames]
    : [...stepOneMissionFieldNames, ...stepOneVisibleFieldNames, ...stepOneTransportFieldNames];
  const activeMealFieldNames = mealSectionFieldNames[activeMealSection] ?? mealSectionFieldNames.breakfast;

  const activeMember = members[activeMemberIndex];
  const filledMemberCount = members.filter((member) => isMemberFilled(member)).length;
  const activeVehicle = vehicles[activeVehicleIndex];
  const filledVehicles = getFilledVehicles(vehicles);
  const filledVehicleCount = filledVehicles.length;
  const hasPreviousVehicle = activeVehicleIndex > 0;
  const hasNextVehicle = activeVehicleIndex < VEHICLE_LIMIT - 1;
  const activeEquipment = equipmentItems[activeEquipmentIndex];
  const filledEquipmentItems = getFilledEquipmentItems(equipmentItems);
  const filledEquipmentCount = filledEquipmentItems.length;
  const hasPreviousEquipment = activeEquipmentIndex > 0;
  const hasNextEquipment = activeEquipmentIndex < EQUIPMENT_LIMIT - 1;

  function focusVehicleIndex(nextIndex) {
    const safeIndex = Math.min(Math.max(nextIndex, 0), VEHICLE_LIMIT - 1);
    setActiveVehicleIndex(safeIndex);
    setVehicleErrors(emptyVehicleError);
  }

  function openMemberModal() {
    if (hidePersonalFields) {
      return;
    }

    const firstIncompleteIndex = members.findIndex((member) => !isMemberFilled(member));
    setActiveMemberIndex(firstIncompleteIndex === -1 ? MEMBER_LIMIT - 1 : firstIncompleteIndex);
    setMemberErrors(emptyMemberError);
    setIsMemberModalOpen(true);
  }

  function closeMemberModal() {
    setMemberErrors(emptyMemberError);
    setIsMemberModalOpen(false);
  }

  function openVehicleModal() {
    const firstIncompleteIndex = vehicles.findIndex((vehicle) => !isVehicleFilled(vehicle));
    focusVehicleIndex(firstIncompleteIndex === -1 ? VEHICLE_LIMIT - 1 : firstIncompleteIndex);
    setIsVehicleModalOpen(true);
  }

  function closeVehicleModal() {
    setVehicleErrors(emptyVehicleError);
    setIsVehicleModalOpen(false);
  }

  function showPreviousVehicle() {
    focusVehicleIndex(activeVehicleIndex - 1);
  }

  function showNextVehicle() {
    focusVehicleIndex(activeVehicleIndex + 1);
  }

  function focusEquipmentIndex(nextIndex) {
    const safeIndex = Math.min(Math.max(nextIndex, 0), EQUIPMENT_LIMIT - 1);
    setActiveEquipmentIndex(safeIndex);
    setEquipmentErrors(emptyEquipmentError);
  }

  function openEquipmentModal() {
    const firstIncompleteIndex = equipmentItems.findIndex((item) => !isEquipmentFilled(item));
    focusEquipmentIndex(firstIncompleteIndex === -1 ? EQUIPMENT_LIMIT - 1 : firstIncompleteIndex);
    setIsEquipmentModalOpen(true);
  }

  function closeEquipmentModal() {
    setEquipmentErrors(emptyEquipmentError);
    setIsEquipmentModalOpen(false);
  }

  function showPreviousEquipment() {
    focusEquipmentIndex(activeEquipmentIndex - 1);
  }

  function showNextEquipment() {
    focusEquipmentIndex(activeEquipmentIndex + 1);
  }

  function handleMemberChange(event) {
    const { name, value } = event.target;
    setMembers((current) => {
      const next = [...current];
      next[activeMemberIndex] = { ...next[activeMemberIndex], [name]: value };
      return next;
    });

    if (name === "phone") {
      const trimmedPhone = value.trim();
      setMemberErrors((current) => ({
        ...current,
        phone: !trimmedPhone || memberPhoneRegex.test(trimmedPhone) ? "" : "លេខទូរស័ព្ទមិនត្រឹមត្រូវ។"
      }));
      return;
    }

    setMemberErrors((current) => ({ ...current, [name]: "" }));
  }

  function handleVehicleChange(event) {
    const { name, value } = event.target;
    setVehicles((current) => {
      const next = [...current];
      const cur = next[activeVehicleIndex];
      if (name === "plateType") {
        next[activeVehicleIndex] = { ...cur, plateType: value, plate: "" };
      } else if (name === "plate") {
        next[activeVehicleIndex] = { ...cur, plate: filterPlateValue(value, cur.plateType || "standard") };
      } else {
        next[activeVehicleIndex] = { ...cur, [name]: value };
      }
      return next;
    });
    setVehicleErrors((current) => ({ ...current, plate: name === "plateType" ? "" : (name === "plate" ? "" : current.plate), brand: name === "brand" ? "" : current.brand }));
  }

  function handleVehicleDelete(vehicleIndex) {
    setVehicles((current) => {
      const next = [...current];
      next[vehicleIndex] = createEmptyVehicle();
      return next;
    });

    if (vehicleIndex === activeVehicleIndex) {
      setVehicleErrors(emptyVehicleError);
    }
  }

  function handleEquipmentChange(event) {
    const { name, value } = event.target;
    setEquipmentItems((current) => {
      const next = [...current];
      next[activeEquipmentIndex] = { ...next[activeEquipmentIndex], [name]: value };
      return next;
    });

    setEquipmentErrors((current) => ({ ...current, [name]: "" }));
  }

  function handleEquipmentDelete(equipmentIndex) {
    setEquipmentItems((current) => {
      const next = [...current];
      next[equipmentIndex] = createEmptyEquipment();
      return next;
    });

    if (equipmentIndex === activeEquipmentIndex) {
      setEquipmentErrors(emptyEquipmentError);
    }
  }

  function handleMemberSupportFileChange(file) {
    setMembers((current) => {
      const next = [...current];
      next[activeMemberIndex] = { ...next[activeMemberIndex], supportFile: file };
      return next;
    });
  }

  function handleClearSupportFile() {
    onSupportFileChange(null);
    if (supportFileInputRef.current) {
      supportFileInputRef.current.value = "";
    }
  }

  function handleClearLodgingImage() {
    onLodgingImageChange(null);
    if (lodgingImageInputRef.current) {
      lodgingImageInputRef.current.value = "";
    }
  }

  function handleClearBreakfastImage() {
    onBreakfastImageChange(null);
    if (breakfastImageInputRef.current) {
      breakfastImageInputRef.current.value = "";
    }
  }

  function handleClearLunchImage() {
    onLunchImageChange(null);
    if (lunchImageInputRef.current) {
      lunchImageInputRef.current.value = "";
    }
  }

  function handleClearDinnerImage() {
    onDinnerImageChange(null);
    if (dinnerImageInputRef.current) {
      dinnerImageInputRef.current.value = "";
    }
  }

  function handleClearImplementationImage() {
    onImplementationImageChange(null);
    if (implementationImageInputRef.current) {
      implementationImageInputRef.current.value = "";
    }
  }

  function handleClearMemberSupportFile() {
    setMembers((current) => {
      const next = [...current];
      next[activeMemberIndex] = { ...next[activeMemberIndex], supportFile: null };
      return next;
    });

    clearInputValue(memberSupportFileInputRef);
  }

  function resetMemberState() {
    setMembers(createMemberList());
    setActiveMemberIndex(0);
    setMemberErrors(emptyMemberError);
    setIsMemberModalOpen(false);
    clearInputValue(memberSupportFileInputRef);
  }

  function resetVehicleState() {
    setVehicles(createVehicleList());
    setActiveVehicleIndex(0);
    setVehicleErrors(emptyVehicleError);
    setIsVehicleModalOpen(false);
  }

  function resetEquipmentState() {
    setEquipmentItems(createEquipmentList());
    setActiveEquipmentIndex(0);
    setEquipmentErrors(emptyEquipmentError);
    setIsEquipmentModalOpen(false);
  }

  function handleCurrentStepReset() {
    if (activeStep === 1) {
      onReset(stepOneFieldNames, { clearPhoneError: true, resetStatus: true });
      if (!hidePersonalFields) {
        handleClearSupportFile();
      }
      resetMemberState();
      resetVehicleState();
      setVehiclePlateType("");
      setVehiclePlateError("");
      return;
    }

    if (activeStep === 2) {
      onReset(stepTwoFieldNames, { resetStatus: true });
      resetEquipmentState();
      return;
    }

    if (activeStep === 3) {
      onReset(stepFourFieldNames, { resetStatus: true });
      handleClearLodgingImage();
      return;
    }

    if (activeStep === 4) {
      onReset(activeMealFieldNames, { resetStatus: true });
      activeMealConfig.onClearImage();
      setMealStepError("");
      return;
    }

    if (activeStep === 5) {
      onReset(stepSixFieldNames, { resetStatus: true });
      handleClearImplementationImage();
    }
  }

  function showMealSection(sectionId) {
    setActiveMealSection(sectionId);
    setMealStepError("");
  }

  function showNextStepFromMeals() {
    const incompleteMealSection = mealSections.find((section) =>
      [section.placeName, section.countName, section.femaleName, section.paymentUnitName, section.sponsorName].some(
        (fieldName) => !String(formData[fieldName] ?? "").trim()
      )
    );

    if (incompleteMealSection) {
      setActiveMealSection(incompleteMealSection.id);
      setMealStepError(`សូមបំពេញព័ត៌មាន${incompleteMealSection.optionLabel}ឲ្យបានគ្រប់ជាមុនសិន។`);
      return;
    }

    setMealStepError("");
    setActiveStep(5);
  }

  function handleFormSubmit(event) {
    const primaryVehicle = {
      brand: (formData.vehicleBrand || "").trim(),
      plate: (formData.vehiclePlate || "").trim()
    };
    const vehiclesWithPrimary =
      primaryVehicle.brand || primaryVehicle.plate ? [primaryVehicle, ...vehicles] : vehicles;

    const primaryEquipment = {
      type: (formData.equipmentType || "").trim(),
      quantity: String(formData.equipmentCount ?? "").trim()
    };
    const equipmentWithPrimary =
      primaryEquipment.type || primaryEquipment.quantity
        ? [primaryEquipment, ...equipmentItems]
        : equipmentItems;

    onSubmit(event, { members, vehicles: vehiclesWithPrimary, equipmentItems: equipmentWithPrimary });
  }

  return (
    <section className="form-section">
      <div className="form-card">
        <div className="form-header">
          <div>
            <h2>{editingReportId ? "កែប្រែសំណើ" : "បំពេញសំណើរថ្មី"}</h2>
            {editingReportId ? (
              <p style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ fontFamily: "monospace", fontSize: 13, color: "#9a7840" }}>{editingReportId}</span>
                {onCancelEdit && (
                  <button className="ghost" type="button" style={{ fontSize: 13, padding: "2px 10px" }} onClick={onCancelEdit}>
                    បោះបង់
                  </button>
                )}
              </p>
            ) : (
              <p>សូមបំពេញព័ត៌មានខាងក្រោម ដើម្បីបង្កើតសំណើរថយន្តជាឯកសារ PDF។</p>
            )}
          </div>
        </div>

        <form id="missionForm" onSubmit={handleFormSubmit}>
          <div className="step-indicator" role="status" aria-live="polite">
            <span className={activeStep === 1 ? "step-node active" : "step-node"}>1</span>
            <span className={activeStep === 2 ? "step-node active" : "step-node"}>2</span>
            <span className={activeStep === 3 ? "step-node active" : "step-node"}>3</span>
            <span className={activeStep === 4 ? "step-node active" : "step-node"}>4</span>
            <span className={activeStep === 5 ? "step-node active" : "step-node"}>5</span>
          </div>
          <div className={`phase-grid step-${activeStep}`}>
            {activeStep === 1 && missionPanelContent ? <div className="step-1-section form-step-bundle">{missionPanelContent}</div> : null}
            {hideMissionSection ? null : (
              <section className="phase-card phase-mission step-1-section">
              <div className="phase-header">
                <h3>ព័ត៌មានបេសកកម្ម</h3>
                <p>សូមបំពេញព័ត៌មានបេសកកម្មឲ្យបានច្បាស់លាស់។</p>
              </div>
              <div className="field-grid">
                <label className="field full">
                  <span>បេសកកម្ម</span>
                  <input
                    type="text"
                    name="missionTitle"
                    placeholder="បញ្ចូលឈ្មោះបេសកកម្ម"
                    value={formData.missionTitle}
                    onChange={onChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>ថ្ងៃចេញ</span>
                  <input type="date" name="departureDate" value={formData.departureDate} onChange={onChange} required />
                </label>
                <label className="field">
                  <span>ថ្ងៃត្រឡប់</span>
                  <input type="date" name="returnDate" value={formData.returnDate} onChange={onChange} required />
                </label>
                <label className="field full">
                  <span>ទីកន្លែងបេសកកម្ម</span>
                  <input
                    type="text"
                    name="missionPlace"
                    placeholder="ឧ. ខេត្ត/រាជធានី, ភូមិ, ឃុំ/សង្កាត់, ស្រុក/ខណ្ឌ"
                    value={formData.missionPlace}
                    onChange={onChange}
                    required
                  />
                </label>
                <label className="field full">
                  <span>សេចក្ដីពណ៌នាបេសកកម្ម</span>
                  <textarea
                    name="mission"
                    rows="4"
                    placeholder="ពិពណ៌នាគោលបំណង កាលបរិច្ឆេទ និងតំបន់បេសកកម្ម"
                    value={formData.mission}
                    onChange={onChange}
                    required
                  />
                </label>
              </div>
              </section>
            )}

            <section className="phase-card phase-personal step-1-section">
              <div className="phase-header">
                <h3>{hidePersonalFields ? "ចំនួនកងកំលាំង" : "ព័ត៌មានផ្ទាល់ខ្លួន"}</h3>
                <p>
                  {hidePersonalFields
                    ? "សូមបំពេញចំនួនកងកំលាំង និងសមាជិកដែលពាក់ព័ន្ធ។"
                    : "សូមបំពេញព័ត៌មានអ្នកស្នើសុំ និងឯកសារភ្ជាប់។"}
                </p>
              </div>
              {!hidePersonalFields ? (
                <>
                  <div className="field-grid">
                    <label className="field full">
                      <span>គោត្តនាម</span>
                      <input
                        type="text"
                        name="name"
                        placeholder="បញ្ចូលឈ្មោះពេញ"
                        value={formData.name}
                        onChange={onChange}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>លេខទូរស័ព្ទ</span>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="e.g. 012-345-678"
                        value={formData.phone}
                        onChange={onChange}
                        autoComplete="tel"
                        inputMode="numeric"
                        aria-invalid={phoneError ? "true" : "false"}
                        aria-describedby={phoneError ? "phoneError" : undefined}
                        className={phoneError ? "input-error" : ""}
                        required
                      />
                      {phoneError ? (
                        <p className="field-error" id="phoneError" role="alert">
                          {phoneError}
                        </p>
                      ) : null}
                    </label>
                    <label className="field">
                      <span>ភេទ</span>
                      <select name="gender" value={formData.gender} onChange={onChange} required>
                        <option value="" disabled>
                          ជ្រើសរើសភេទ
                        </option>
                        <option value="male">ប្រុស</option>
                        <option value="female">ស្រី</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>តួនាទី</span>
                      <input
                        type="text"
                        name="role"
                        placeholder="e.g. Team Lead / Member"
                        value={formData.role}
                        onChange={onChange}
                        required
                      />
                    </label>
                  </div>
                  <div className="upload-block">
                    <div className="upload-label">ឯកសារភ្ជាប់</div>
                    <label className="upload-area" htmlFor="supportFile">
                      <span className="upload-icon" aria-hidden="true">
                        ↑
                      </span>
                      <span className="upload-text">បញ្ជូលរូបភាព</span>
                      <input
                        id="supportFile"
                        ref={supportFileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(event) => onSupportFileChange(event.target.files?.[0] ?? null)}
                      />
                    </label>
                    {supportFile ? (
                      <div className="upload-file-actions">
                        <p className="status">{supportFile.name}</p>
                        <button className="ghost upload-remove" type="button" onClick={handleClearSupportFile}>
                          លុបរូបភាព
                        </button>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
              {!hidePersonalFields ? (
                <button className="member-add" type="button" onClick={openMemberModal}>
                  បន្ថែមសមាជិក
                </button>
              ) : null}
              <div className="field-grid member-extra-grid">
                <label className="field">
                  <span>ចំនួនផែនការ</span>
                  <input
                    type="number"
                    name="planCount"
                    min="0"
                    placeholder="0"
                    value={formData.planCount}
                    onChange={onChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>ចំនួនជាក់ស្តែង</span>
                  <input
                    type="number"
                    name="actualCount"
                    min="0"
                    placeholder="0"
                    value={formData.actualCount}
                    onChange={onChange}
                    required
                  />
                </label>
              </div>
              {!hidePersonalFields ? (
                <p className="status member-status">
                  សមាជិកដែលបានបំពេញរួច៖ {filledMemberCount}/{MEMBER_LIMIT}
                </p>
              ) : null}
            </section>

	            <section className="phase-card step-1-section">
	              <div className="phase-header">
	                <h3>មធ្យោបាយបច្ចេកទេស និងធ្វើដំណើរ</h3>
	                <p>សូមបំពេញព័ត៌មានរថយន្តសម្រាប់បេសកកម្មនេះ។</p>
	              </div>
              <div className="field-grid">
                <div className="field vehicle-brand-wrap">
                  <span>ម៉ាករថយន្ត</span>
                  <input
                    type="text"
                    name="vehicleBrand"
                    placeholder="បញ្ចូលម៉ាករថយន្ត"
                    value={formData.vehicleBrand}
                    onChange={onChange}
                    required
                  />
                  <button className="vehicle-add" type="button" onClick={openVehicleModal}>
                    បន្ថែមរថយន្ត
                  </button>
                  <div className="vehicle-status-preview" tabIndex={0}>
                    <p className="status vehicle-status">
                      រថយន្តដែលបានបំពេញរួច– {filledVehicleCount}/{VEHICLE_LIMIT}
                    </p>
                    <div className="vehicle-preview-card" role="note">
                      <p className="vehicle-preview-title">រថយន្តដែលបានបំពេញរួច</p>
                      {filledVehicles.length ? (
                        <ul className="vehicle-preview-list">
                          {filledVehicles.map((vehicle) => (
                            <li key={`${vehicle.plate}-${vehicle.index}`} className="vehicle-preview-item">
                              <span className="vehicle-preview-index">#{vehicle.index + 1}</span>
                              <span className="vehicle-preview-text">
                                {vehicle.brand} - {vehicle.plate}
                              </span>
                              <button
                                className="vehicle-preview-delete"
                                type="button"
                                onClick={() => handleVehicleDelete(vehicle.index)}
                              >
                                លុប
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="vehicle-preview-empty">មិនទាន់មានរថយន្តដែលបានបំពេញនៅឡើយទេ។</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="field">
                  <span>ស្លាកលេខ</span>
                  {!vehiclePlateType ? (
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          setVehiclePlateType(e.target.value);
                          setVehiclePlateError("");
                          onChange({ target: { name: "vehiclePlate", value: "" } });
                        }
                      }}
                    >
                      <option value="">ជ្រើសប្រភេទស្លាក...</option>
                      <option value="standard">ស្លាកលេខ (2XX-XXXX)</option>
                      <option value="cambodia">កម្ពុជា (អតិបរមា 8 តួ)</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="vehiclePlate"
                      placeholder={vehiclePlateType === "cambodia" ? "អតិបរមា 8 តួ" : "ឧ. 2AB-1234"}
                      value={formData.vehiclePlate}
                      onChange={(e) => {
                        const filtered = filterPlateValue(e.target.value, vehiclePlateType);
                        setVehiclePlateError(getPlateError(filtered, vehiclePlateType));
                        onChange({ target: { name: "vehiclePlate", value: filtered } });
                      }}
                      className={vehiclePlateError ? "input-error" : ""}
                      required
                    />
                  )}
                  {vehiclePlateError && <p className="field-error">{vehiclePlateError}</p>}
                </div>
                <label className="field">
                  <span>ចំនួនជាក់ស្តែង</span>
                  <input
                    type="number"
                    name="vehicleCount"
                    min="0"
                    max="50"
                    placeholder="អតិបរមា 50"
                    value={formData.vehicleCount}
                    onChange={onChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>ចំនួនផែនការ</span>
                  <input
                    type="number"
                    name="vehiclePlanCount"
                    min="0"
                    max="50"
                    placeholder="0"
                    value={formData.vehiclePlanCount}
                    onChange={onChange}
                    required
                  />
                </label>
              </div>
            </section>
            <section className="phase-card step-2-section">
              <div className="phase-header">
                <h3>សម្ភារៈបច្ចេកទេស</h3>
                <p>សូមបំពេញព័ត៌មានសម្ភារៈដែលត្រូវប្រើក្នុងបេសកកម្ម។</p>
              </div>
              <div className="field-grid">
                <div className="field equipment-type-wrap">
                  <span>ប្រភេទ</span>
                  <input
                    type="text"
                    name="equipmentType"
                    placeholder="បញ្ចូលប្រភេទសម្ភារៈ"
                    value={formData.equipmentType}
                    onChange={onChange}
                    required
                  />
                </div>
                <label className="field">
                  <span>ចំនួន</span>
                  <input
                    type="number"
                    name="equipmentCount"
                    min="0"
                    placeholder="បញ្ចូលចំនួន"
                    value={formData.equipmentCount}
                    onChange={onChange}
                    required
                  />
                </label>
                <div className="equipment-actions">
                  <button className="equipment-add" type="button" onClick={openEquipmentModal}>
                    ប្រភេទសម្ភារៈ
                  </button>
                  <div className="equipment-status-preview" tabIndex={0}>
                    <p className="status equipment-status">
                      សម្ភារៈដែលបានបំពេញរួច– {filledEquipmentCount}/{EQUIPMENT_LIMIT}
                    </p>
                    <div className="equipment-preview-card" role="note">
                      <p className="equipment-preview-title">សម្ភារៈដែលបានបំពេញរួច</p>
                      {filledEquipmentItems.length ? (
                        <ul className="equipment-preview-list">
                          {filledEquipmentItems.map((equipment) => (
                            <li key={`${equipment.type}-${equipment.index}`} className="equipment-preview-item">
                              <span className="equipment-preview-index">#{equipment.index + 1}</span>
                              <span className="equipment-preview-text">
                                {equipment.type} - {equipment.quantity}
                              </span>
                              <button
                                className="equipment-preview-delete"
                                type="button"
                                onClick={() => handleEquipmentDelete(equipment.index)}
                              >
                                លុប
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="equipment-preview-empty">មិនទាន់មានសម្ភារៈដែលបានបំពេញនៅឡើយទេ។</p>
                      )}
                    </div>
                  </div>
                  <div className="equipment-extra-grid">
                    <label className="field">
                      <span>ចំនួនផែនការ</span>
                      <input
                        type="number"
                        name="equipmentPlanCount"
                        min="0"
                        placeholder="0"
                        value={formData.equipmentPlanCount}
                        onChange={onChange}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>ចំនួនជាក់ស្តែង</span>
                      <input
                        type="number"
                        name="equipmentActualCount"
                        min="0"
                        placeholder="0"
                        value={formData.equipmentActualCount}
                        onChange={onChange}
                        required
                      />
                    </label>
                  </div>
                </div>
              </div>
            </section>
            <section className="phase-card phase-request step-2-section">
              <div className="phase-header">
                <h3>ពេលវេលាចេញដំណើរ និងទៅដល់</h3>
                <p>សូមបំពេញពេលវេលា និងព័ត៌មានចម្ងាយសម្រាប់ការធ្វើដំណើរ។</p>
              </div>
	              <div className="field-grid">
	                <label className="field">
	                  <span>ចេញដំណើរ</span>
	                  <input
	                    type="date"
	                    name="departDate"
                    value={formData.departDate}
                    onChange={onChange}
                    required
	                  />
	                </label>
	                <label className="field">
	                  <span>ទៅដល់</span>
	                  <input
	                    type="date"
	                    name="arriveDate"
                    value={formData.arriveDate}
                    onChange={onChange}
                    required
	                  />
	                </label>
	                <label className="field">
	                  <span>ចំងាយផ្លូវ</span>
	                  <input
	                    type="text"
	                    name="routeDistance"
	                    placeholder="បញ្ចូលចំងាយផ្លូវ"
	                    value={formData.routeDistance}
	                    onChange={onChange}
	                    required
	                  />
	                </label>
	                <label className="field compact-duration-field">
	                  <span>រយៈពេល​ធ្វើដំណើរទៅដល់ទីតាំង</span>
	                  <div className="duration-input-wrap">
	                    <input
	                      type="number"
	                      name="travelDuration"
	                      min="1"
	                      max="24"
	                      step="1"
	                      inputMode="numeric"
	                      placeholder="1-24"
	                      value={formData.travelDuration}
	                      onChange={onChange}
	                      required
	                    />
	                    <span className="duration-input-addon">ម៉ោង</span>
	                  </div>
                </label>
              </div>
            </section>
            <section className="phase-card step-3-section">
              <div className="phase-header">
                <h3>ពិនិត្យគោលដៅ និងប្រជុំស្តាប់ផែនការ</h3>
                <p>សូមបំពេញព័ត៌មានអ្នកចូលរួម និងរយៈពេលប្រជុំ។</p>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>អ្នកចូលរួម (ចំនួន)</span>
                  <input
                    type="number"
                    name="meetingParticipantsCount"
                    min="0"
                    placeholder="0"
                    value={formData.meetingParticipantsCount}
                    onChange={onChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>អ្នកចូលរួម (ស្រី)</span>
                  <input
                    type="number"
                    name="meetingParticipantsFemale"
                    min="0"
                    placeholder="0"
                    value={formData.meetingParticipantsFemale}
                    onChange={onChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>រយៈពេល (ចាប់ផ្តើម)</span>
                  <input
                    type="time"
                    name="meetingStartTime"
                    value={formData.meetingStartTime}
                    onChange={onChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>រយៈពេល (បញ្ចប់)</span>
                  <input
                    type="time"
                    name="meetingEndTime"
                    value={formData.meetingEndTime}
                    onChange={onChange}
                    required
                  />
                </label>
              </div>
            </section>
            <section className="phase-card step-3-section">
              <div className="phase-header">
                <h3>ការស្នាក់នៅ</h3>
                <p>សូមបំពេញទីតាំងស្នាក់នៅ រូបភាព និងចំនួនអ្នកស្នាក់នៅ។</p>
              </div>
              <div className="field-grid lodging-count-grid">
                <label className="field full">
                  <span>ទីតាំងស្នាក់នៅ</span>
                  <input
                    type="text"
                    name="lodgingPlace"
                    placeholder="កន្លែង"
                    value={formData.lodgingPlace}
                    onChange={onChange}
                    required
                  />
                </label>
              </div>
              <div className="upload-block">
                <div className="upload-label">រូបភាព</div>
                <label className="upload-area" htmlFor="lodgingImage">
                  <span className="upload-icon" aria-hidden="true">
                    ↑
                  </span>
                  <span className="upload-text">បញ្ជូលរូបភាព</span>
                  <input
                    id="lodgingImage"
                    ref={lodgingImageInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(event) => onLodgingImageChange(event.target.files?.[0] ?? null)}
                  />
                </label>
                {lodgingImage ? (
                  <div className="upload-file-actions">
                    <p className="status">{lodgingImage.name}</p>
                    <button className="ghost upload-remove" type="button" onClick={handleClearLodgingImage}>
                      លុបរូបភាព
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="field-grid">
                <label className="field">
                  <span className="label-tight">ចំនួនអ្នកស្នាក់នៅ (ចំនួន)</span>
                  <input
                    type="number"
                    name="lodgingCount"
                    min="0"
                    placeholder="0"
                    value={formData.lodgingCount}
                    onChange={onChange}
                    required
                  />
                </label>
                <label className="field">
                  <span className="label-tight">ចំនួនអ្នកស្នាក់នៅ (ស្រី)</span>
                  <input
                    type="number"
                    name="lodgingFemale"
                    min="0"
                    placeholder="0"
                    value={formData.lodgingFemale}
                    onChange={onChange}
                    required
                  />
                </label>
              </div>
            </section>
            <section className="phase-card step-4-section meal-phase-card">
              <div className="phase-header">
                <h3>ការបរិភោគអាហារ</h3>
                <p>ជ្រើសរើសវេនបរិភោគអាហារ ហើយបំពេញទីតាំងបរិភោគ រូបភាព និងចំនួនអ្នកបរិភោគ។</p>
              </div>
              <div className="meal-select-wrap">
                <label className="field meal-select-field">
                  <span>ជ្រើសរើសវេនបរិភោគអាហារ</span>
                  <select value={activeMealSection} onChange={(event) => showMealSection(event.target.value)}>
                    {mealSections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.optionLabel}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="meal-panel" key={activeMealConfig.id}>
                <div className="meal-panel-header">
                  <h4>{activeMealConfig.title}</h4>
                  <p>សូមបំពេញទីតាំងបរិភោគ រូបភាព និងចំនួនអ្នកបរិភោគ។</p>
                </div>
                <div className="field-grid">
                  <label className="field full">
                    <span>ទីតាំងបរិភោគ</span>
                    <input
                      type="text"
                      name={activeMealConfig.placeName}
                      placeholder="កន្លែង"
                      value={formData[activeMealConfig.placeName]}
                      onChange={onChange}
                      required
                    />
                  </label>
                </div>
                <div className="upload-block">
                  <div className="upload-label">រូបភាព</div>
                  <label className="upload-area" htmlFor={activeMealConfig.imageId}>
                    <span className="upload-icon" aria-hidden="true">
                      ↑
                    </span>
                    <span className="upload-text">បញ្ជូលរូបភាព</span>
                    <input
                      id={activeMealConfig.imageId}
                      ref={activeMealConfig.imageInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={(event) => activeMealConfig.onImageChange(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  {activeMealConfig.image ? (
                    <div className="upload-file-actions">
                      <p className="status">{activeMealConfig.image.name}</p>
                      <button className="ghost upload-remove" type="button" onClick={activeMealConfig.onClearImage}>
                        លុបរូបភាព
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="field-grid">
                  <label className="field">
                    <span>ចំនួនអ្នកបរិភោគ (ចំនួន)</span>
                    <input
                      type="number"
                      name={activeMealConfig.countName}
                      min="0"
                      placeholder="0"
                      value={formData[activeMealConfig.countName]}
                      onChange={onChange}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>ចំនួនអ្នកបរិភោគ (ស្រី)</span>
                    <input
                      type="number"
                      name={activeMealConfig.femaleName}
                      min="0"
                      placeholder="0"
                      value={formData[activeMealConfig.femaleName]}
                      onChange={onChange}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>ការទូទាត់ (អង្គភាព)</span>
                    <input
                      type="text"
                      name={activeMealConfig.paymentUnitName}
                      placeholder="អង្គភាព"
                      value={formData[activeMealConfig.paymentUnitName]}
                      onChange={onChange}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>ការទូទាត់ (អ្នកឧបត្ថម្ភ)</span>
                    <input
                      type="text"
                      name={activeMealConfig.sponsorName}
                      placeholder="អ្នកឧបត្ថម្ភ"
                      value={formData[activeMealConfig.sponsorName]}
                      onChange={onChange}
                      required
                    />
                  </label>
                </div>
              </div>
              {mealStepError ? (
                <p className="field-error meal-step-error" role="alert">
                  {mealStepError}
                </p>
              ) : null}
            </section>
            <section className="phase-card step-5-section">
              <div className="phase-header">
                <h3>ការអនុវត្តន៍ជាក់ស្តែង</h3>
                <p>សូមបំពេញផែនការ ជាក់ស្តែង និងរយៈពេលនៃការអនុវត្តន៍។</p>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>ផែនការ (ចំនួនសរុប)</span>
                  <input
                    type="number"
                    name="implementationPlanTotal"
                    min="0"
                    placeholder="0"
                    value={formData.implementationPlanTotal}
                    onChange={onChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>ផែនការ (ស្រី)</span>
                  <input
                    type="number"
                    name="implementationPlanFemale"
                    min="0"
                    placeholder="0"
                    value={formData.implementationPlanFemale}
                    onChange={onChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>ជាក់ស្តែង (ចំនួនសរុប)</span>
                  <input
                    type="number"
                    name="implementationActualTotal"
                    min="0"
                    placeholder="0"
                    value={formData.implementationActualTotal}
                    onChange={onChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>ជាក់ស្តែង (ស្រី)</span>
                  <input
                    type="number"
                    name="implementationActualFemale"
                    min="0"
                    placeholder="0"
                    value={formData.implementationActualFemale}
                    onChange={onChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>រយៈពេលនៃការអនុវត្តន៍ (ត្រួតពិនិត្យ)</span>
                  <input
                    type="time"
                    name="implementationDurationCheck"
                    value={formData.implementationDurationCheck}
                    onChange={onChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>រយៈពេលនៃការអនុវត្តន៍ (គ្រប់គ្រង)</span>
                  <input
                    type="time"
                    name="implementationDurationManage"
                    value={formData.implementationDurationManage}
                    onChange={onChange}
                    required
                  />
                </label>
              </div>
              <div className="upload-block">
                <div className="upload-label upload-label-dark">បញ្ចប់</div>
                <label className="upload-area" htmlFor="implementationImage">
                  <span className="upload-icon" aria-hidden="true">
                    ↑
                  </span>
                  <span className="upload-text">បញ្ជូលរូបភាព</span>
                  <input
                    id="implementationImage"
                    ref={implementationImageInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(event) => onImplementationImageChange(event.target.files?.[0] ?? null)}
                  />
                </label>
                {implementationImage ? (
                  <div className="upload-file-actions">
                    <p className="status">{implementationImage.name}</p>
                    <button className="ghost upload-remove" type="button" onClick={handleClearImplementationImage}>
                      លុបរូបភាព
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
            <section className="phase-card step-5-section">
              <div className="phase-header">
                <h3>ពេលវេលាចេញដំណើរត្រឡប់មកវិញ</h3>
                <p>សូមបំពេញពេលវេលា និងស្តានភាពសុវត្ថិភាព។</p>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>ពេលវេលា (ចេញដំណើរ)</span>
                  <input
                    type="time"
                    name="returnDepartTime"
                    value={formData.returnDepartTime}
                    onChange={onChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>ពេលវេលា (មកដល់)</span>
                  <input
                    type="time"
                    name="returnArriveTime"
                    value={formData.returnArriveTime}
                    onChange={onChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>ស្តានភាព</span>
                  <select name="returnSafetyStatus" value={formData.returnSafetyStatus} onChange={onChange} required>
                    <option value="" disabled>
                      ជ្រើសរើសស្តានភាព
                    </option>
                    <option value="safe">សុវត្ថិភាព</option>
                    <option value="unsafe">អត់សុវត្ថិភាព</option>
                  </select>
                </label>
                {formData.returnSafetyStatus === "unsafe" ? (
                  <label className="field">
                    <span>បញ្ហា</span>
                    <input
                      type="text"
                      name="returnIssue"
                      placeholder="បញ្ចូលបញ្ហា"
                      value={formData.returnIssue}
                      onChange={onChange}
                      required
                    />
                  </label>
                ) : null}
              </div>
            </section>
          </div>

          <div className="actions">
            {activeStep === 1 ? (
              <>
                <button className="primary" type="button" onClick={() => setActiveStep(2)}>
                  បន្ទាប់
                </button>
                <button className="ghost" type="button" onClick={handleCurrentStepReset}>
                  សម្អាត
                </button>
              </>
            ) : null}
            {activeStep === 2 ? (
              <>
                <button className="ghost" type="button" onClick={() => setActiveStep(1)}>
                  ត្រឡប់
                </button>
                <button className="primary" type="button" onClick={() => setActiveStep(3)}>
                  បន្ទាប់
                </button>
                <button className="ghost" type="button" onClick={handleCurrentStepReset}>
                  សម្អាត
                </button>
              </>
            ) : null}
            {activeStep === 3 ? (
              <>
                <button className="ghost" type="button" onClick={() => setActiveStep(2)}>
                  ត្រឡប់
                </button>
                <button className="primary" type="button" onClick={() => setActiveStep(4)}>
                  បន្ទាប់
                </button>
                <button className="ghost" type="button" onClick={handleCurrentStepReset}>
                  សម្អាត
                </button>
              </>
            ) : null}
            {activeStep === 4 ? (
              <>
                <button className="ghost" type="button" onClick={() => setActiveStep(3)}>
                  ត្រឡប់
                </button>
                <button className="primary" type="button" onClick={showNextStepFromMeals}>
                  បន្ទាប់
                </button>
                <button className="ghost" type="button" onClick={handleCurrentStepReset}>
                  សម្អាត
                </button>
              </>
            ) : null}
            {activeStep === 5 ? (
              <>
                <button className="ghost" type="button" onClick={() => setActiveStep(4)}>
                  ត្រឡប់
                </button>
                <button
                  className="primary"
                  type="button"
                  onClick={handleFormSubmit}
                  disabled={submitDisabled}
                  style={submitDisabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                >
                  {editingReportId ? "រក្សាទុកការកែប្រែ" : "បញ្ជូន និងបង្កើត PDF"}
                </button>
                <button className="ghost" type="button" onClick={handleCurrentStepReset}>
                  សម្អាត
                </button>
                {submitDisabled && (
                  <div style={{ fontSize: 12, color: "#856404", marginTop: 4, width: "100%" }}>
                    ត្រូវការការភ្ជាប់ Internet ដើម្បីបញ្ជូន។ សូម Save Draft ជាមុន។
                  </div>
                )}
                <div className="status" id="statusText">
                  {statusText}
                </div>
              </>
            ) : null}
          </div>
        </form>
      </div>

      {!hidePersonalFields && isMemberModalOpen ? (
        <div className="member-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="memberModalTitle">
          <section className="member-modal-card">
            <div className="member-modal-header">
              <div className="phase-header">
                <h3 id="memberModalTitle">បំពេញព័ត៌មានសមាជិក</h3>
                <p>Fill each member one by one up to {MEMBER_LIMIT} members (excluding requester).</p>
              </div>
              <button className="ghost member-close" type="button" onClick={closeMemberModal}>
                បិទ
              </button>
            </div>

            <section className="phase-card phase-personal member-step-card">
              <div className="field-grid">
                <label className="field full">
                  <span>គោត្តនាម</span>
                  <input
                    type="text"
                    name="name"
                    placeholder="បញ្ចូលឈ្មោះពេញ"
                    value={activeMember.name}
                    onChange={handleMemberChange}
                    className={memberErrors.name ? "input-error" : ""}
                    required
                  />
                  {memberErrors.name ? <p className="field-error">{memberErrors.name}</p> : null}
                </label>
                <label className="field">
                  <span>លេខទូរស័ព្ទ</span>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="ឧ. 012-345-678"
                    value={activeMember.phone}
                    onChange={handleMemberChange}
                    autoComplete="tel"
                    inputMode="numeric"
                    className={memberErrors.phone ? "input-error" : ""}
                    required
                  />
                  {memberErrors.phone ? <p className="field-error">{memberErrors.phone}</p> : null}
                </label>
                <label className="field">
                  <span>ភេទ</span>
                  <select
                    name="gender"
                    value={activeMember.gender}
                    onChange={handleMemberChange}
                    className={memberErrors.gender ? "input-error" : ""}
                    required
                  >
                    <option value="" disabled>
                      ជ្រើសរើសភេទ
                    </option>
                    <option value="male">ប្រុស</option>
                    <option value="female">ស្រី</option>
                  </select>
                  {memberErrors.gender ? <p className="field-error">{memberErrors.gender}</p> : null}
                </label>
                <label className="field">
                  <span>តួនាទី</span>
                  <input
                    type="text"
                    name="role"
                    placeholder="ឧ. មន្រ្តីប្រតិបត្តិ / សមាជិក"
                    value={activeMember.role}
                    onChange={handleMemberChange}
                    className={memberErrors.role ? "input-error" : ""}
                    required
                  />
                  {memberErrors.role ? <p className="field-error">{memberErrors.role}</p> : null}
                </label>
              </div>

              <div className="upload-block">
                <div className="upload-label">ឯកសារភ្ជាប់</div>
                <label className="upload-area" htmlFor={`memberSupportFile-${activeMemberIndex}`}>
                  <span className="upload-icon" aria-hidden="true">
                    ↑
                  </span>
                  <span className="upload-text">បញ្ជូលរូបភាព</span>
                  <input
                    id={`memberSupportFile-${activeMemberIndex}`}
                    ref={memberSupportFileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) => handleMemberSupportFileChange(event.target.files?.[0] ?? null)}
                  />
                </label>
                {activeMember.supportFile ? (
                  <div className="upload-file-actions">
                    <p className="status">{activeMember.supportFile.name}</p>
                    <button className="ghost upload-remove" type="button" onClick={handleClearMemberSupportFile}>
                      លុបរូបភាព
                    </button>
                  </div>
                ) : null}
              </div>
            </section>

            <div className="member-modal-footer">
              <div className="member-progress-wrap">
                <strong className="member-progress">
                  ({filledMemberCount}/{MEMBER_LIMIT})
                </strong>
                <div className="status">កំពុងបំពេញសមាជិកទី {activeMemberIndex + 1}</div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
      {isVehicleModalOpen ? (
        <div className="member-modal-overlay vehicle-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="vehicleModalTitle">
          <section className="member-modal-card vehicle-modal-card">
            <div className="member-modal-header vehicle-modal-header">
              <div className="phase-header">
                <h3 id="vehicleModalTitle">បំពេញព័ត៌មានរថយន្ត</h3>
                <p>Fill each vehicle one by one up to {VEHICLE_LIMIT} vehicles.</p>
              </div>
              <button className="ghost member-close" type="button" onClick={closeVehicleModal}>
                បិទ
              </button>
            </div>

            <section className="phase-card phase-personal member-step-card">
              <div className="field-grid">
                <label className="field">
                  <span>ម៉ាករថយន្ត</span>
                  <input
                    type="text"
                    name="brand"
                    placeholder="បញ្ចូលម៉ាករថយន្ត"
                    value={activeVehicle.brand}
                    onChange={handleVehicleChange}
                    className={vehicleErrors.brand ? "input-error" : ""}
                    required
                  />
                  {vehicleErrors.brand ? <p className="field-error">{vehicleErrors.brand}</p> : null}
                </label>
                <div className="field">
                  <span>ស្លាកលេខ</span>
                  {!activeVehicle.plateType ? (
                    <select
                      name="plateType"
                      defaultValue=""
                      onChange={handleVehicleChange}
                    >
                      <option value="">ជ្រើសប្រភេទស្លាក...</option>
                      <option value="standard">ស្លាកលេខ (2XX-XXXX)</option>
                      <option value="cambodia">កម្ពុជា (អតិបរមា 8 តួ)</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="plate"
                      placeholder={activeVehicle.plateType === "cambodia" ? "អតិបរមា 8 តួ" : "ឧ. 2AB-1234"}
                      value={activeVehicle.plate}
                      onChange={handleVehicleChange}
                      className={vehicleErrors.plate ? "input-error" : ""}
                      required
                    />
                  )}
                  {vehicleErrors.plate ? <p className="field-error">{vehicleErrors.plate}</p> : null}
                </div>
              </div>
            </section>

            <div className="member-modal-footer vehicle-modal-footer">
              <div className="member-progress-wrap">
                <strong className="member-progress">
                  ({filledVehicleCount}/{VEHICLE_LIMIT})
                </strong>
                <div className="status">កំពុងបំពេញរថយន្តទី {activeVehicleIndex + 1}</div>
              </div>
              <div className="vehicle-modal-actions">
                <button className="ghost" type="button" onClick={showPreviousVehicle} disabled={!hasPreviousVehicle}>
                  ថយក្រោយ
                </button>
                <button className="ghost" type="button" onClick={showNextVehicle} disabled={!hasNextVehicle}>
                  បន្ទាប់
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
      {isEquipmentModalOpen ? (
        <div className="member-modal-overlay equipment-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="equipmentModalTitle">
          <section className="member-modal-card equipment-modal-card">
            <div className="member-modal-header equipment-modal-header">
              <div className="phase-header">
                <h3 id="equipmentModalTitle">បំពេញព័ត៌មានសម្ភារៈ</h3>
                <p>Fill each equipment item one by one up to {EQUIPMENT_LIMIT} items.</p>
              </div>
              <button className="ghost member-close" type="button" onClick={closeEquipmentModal}>
                បិទ
              </button>
            </div>

            <section className="phase-card phase-personal member-step-card">
              <div className="field-grid">
                <label className="field">
                  <span>ប្រភេទ</span>
                  <input
                    type="text"
                    name="type"
                    placeholder="បញ្ចូលប្រភេទសម្ភារៈ"
                    value={activeEquipment.type}
                    onChange={handleEquipmentChange}
                    className={equipmentErrors.type ? "input-error" : ""}
                    required
                  />
                </label>
                <label className="field">
                  <span>ចំនួន</span>
                  <input
                    type="number"
                    name="quantity"
                    min="0"
                    placeholder="បញ្ចូលចំនួន"
                    value={activeEquipment.quantity}
                    onChange={handleEquipmentChange}
                    className={equipmentErrors.quantity ? "input-error" : ""}
                    required
                  />
                </label>
              </div>
            </section>

            <div className="member-modal-footer equipment-modal-footer">
              <div className="member-progress-wrap">
                <strong className="member-progress">
                  ({filledEquipmentCount}/{EQUIPMENT_LIMIT})
                </strong>
                <div className="status">កំពុងបំពេញសម្ភារៈទី {activeEquipmentIndex + 1}</div>
              </div>
              <div className="equipment-modal-actions">
                <button className="ghost" type="button" onClick={showPreviousEquipment} disabled={!hasPreviousEquipment}>
                  ថយក្រោយ
                </button>
                <button className="ghost" type="button" onClick={showNextEquipment} disabled={!hasNextEquipment}>
                  បន្ទាប់
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}













