import { useRef, useState } from "react";

const MEMBER_LIMIT = 49;
const memberPhoneRegex = /^(?:0\d{8,9}|0\d{2}-\d{3}-\d{3,4})$/;
const emptyMemberError = { name: "", phone: "", gender: "", role: "" };

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

function isMemberFilled(member) {
  const normalizedPhone = member.phone.trim();
  return Boolean(member.name.trim() && member.gender.trim() && member.role.trim() && memberPhoneRegex.test(normalizedPhone));
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

export default function MissionRequestForm({
  formData,
  supportFile,
  statusText,
  onChange,
  onSubmit,
  onReset,
  onSupportFileChange,
  phoneError,
  hideMissionSection = false
}) {
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [activeMemberIndex, setActiveMemberIndex] = useState(0);
  const [members, setMembers] = useState(() => createMemberList());
  const [memberErrors, setMemberErrors] = useState(emptyMemberError);
  const supportFileInputRef = useRef(null);
  const memberSupportFileInputRef = useRef(null);

  const activeMember = members[activeMemberIndex];
  const filledMemberCount = members.filter((member) => isMemberFilled(member)).length;

  function openMemberModal() {
    const firstIncompleteIndex = members.findIndex((member) => !isMemberFilled(member));
    setActiveMemberIndex(firstIncompleteIndex === -1 ? MEMBER_LIMIT - 1 : firstIncompleteIndex);
    setMemberErrors(emptyMemberError);
    setIsMemberModalOpen(true);
  }

  function closeMemberModal() {
    setMemberErrors(emptyMemberError);
    setIsMemberModalOpen(false);
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

  function handleClearMemberSupportFile() {
    setMembers((current) => {
      const next = [...current];
      next[activeMemberIndex] = { ...next[activeMemberIndex], supportFile: null };
      return next;
    });

    if (memberSupportFileInputRef.current) {
      memberSupportFileInputRef.current.value = "";
    }
  }

  function handleFormReset(event) {
    onReset(event);
    setMembers(createMemberList());
    setActiveMemberIndex(0);
    setMemberErrors(emptyMemberError);
    setIsMemberModalOpen(false);
  }

  function handleFormSubmit(event) {
    onSubmit(event, { members });
  }

  return (
    <section className="form-section">
      <div className="form-card">
        <div className="form-header">
          <div>
            <h2>បំពេញសំណើរថ្មី</h2>
            <p>សូមបំពេញព័ត៌មានខាងក្រោម ដើម្បីបង្កើតសំណើរថយន្តជាឯកសារ PDF។</p>
          </div>
        </div>

        <form id="missionForm" onSubmit={handleFormSubmit} onReset={handleFormReset}>
          <div className="phase-grid">
            {hideMissionSection ? null : (
              <section className="phase-card phase-mission">
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

            <section className="phase-card phase-personal">
              <div className="phase-header">
                <h3>ព័ត៌មានផ្ទាល់ខ្លួន</h3>
                <p>សូមបំពេញព័ត៌មានអ្នកស្នើសុំ និងឯកសារភ្ជាប់។</p>
              </div>
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
                  <span className="upload-text">បញ្ចូល ឬសរសេរភ្ជាប់</span>
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
              <button className="member-add" type="button" onClick={openMemberModal}>
                បន្ថែមសមាជិក
              </button>
              <p className="status member-status">
                សមាជិកដែលបានបំពេញរួច៖ {filledMemberCount}/{MEMBER_LIMIT}
              </p>
            </section>

	            <section className="phase-card">
	              <div className="phase-header">
	                <h3>មធ្យោបាយបច្ចេកទេស និងធ្វើដំណើរ</h3>
	                <p>សូមបំពេញព័ត៌មានរថយន្តសម្រាប់បេសកកម្មនេះ។</p>
	              </div>
	              <div className="field-grid">
	                <label className="field">
	                  <span>ម៉ាករថយន្ត</span>
	                  <input
	                    type="text"
	                    name="vehicleBrand"
	                    placeholder="បញ្ចូលម៉ាករថយន្ត"
	                    value={formData.vehicleBrand}
	                    onChange={onChange}
	                    required
	                  />
	                </label>
	                <label className="field">
	                  <span>ស្លាកលេខ</span>
	                  <input
	                    type="text"
	                    name="vehiclePlate"
	                    placeholder="បញ្ចូលស្លាកលេខ"
	                    value={formData.vehiclePlate}
	                    onChange={onChange}
	                    required
	                  />
	                </label>
	                <label className="field">
	                  <span>ចំនួនរថយន្ត</span>
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
	              </div>
	            </section>
            <section className="phase-card">
              <div className="phase-header">
                <h3>សម្ភារៈបច្ចេកទេស</h3>
                <p>សូមបំពេញព័ត៌មានសម្ភារៈដែលត្រូវប្រើក្នុងបេសកកម្ម។</p>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>ប្រភេទ</span>
                  <input
                    type="text"
                    name="equipmentType"
                    placeholder="បញ្ចូលប្រភេទសម្ភារៈ"
                    value={formData.equipmentType}
                    onChange={onChange}
                    required
                  />
                </label>
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
              </div>
            </section>
            <section className="phase-card phase-request">
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
	                <label className="field">
	                  <span>រយៈពេល</span>
	                  <input
	                    type="text"
	                    name="travelDuration"
	                    placeholder="បញ្ចូលរយៈពេល"
	                    value={formData.travelDuration}
	                    onChange={onChange}
	                    required
                  />
                </label>
              </div>
            </section>
          </div>

          <div className="actions">
            <button className="primary" type="submit">
              បញ្ជូន និងបង្កើត PDF
            </button>
            <button className="ghost" type="reset">
              សម្អាត
            </button>
            <div className="status" id="statusText">
              {statusText}
            </div>
          </div>
        </form>
      </div>

      {isMemberModalOpen ? (
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
                  <span className="upload-text">បញ្ចូល ឬសរសេរភ្ជាប់</span>
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
    </section>
  );
}













