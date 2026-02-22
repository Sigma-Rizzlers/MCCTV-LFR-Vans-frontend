import { useState } from "react";

const MEMBER_LIMIT = 15;
const memberPhoneRegex = /^(?:0\d{8,9}|0\d{2}-\d{3}-\d{3,4})$/;
const emptyMemberError = { name: "", phone: "", role: "" };

function createEmptyMember() {
  return {
    name: "",
    phone: "",
    role: "",
    supportFile: null
  };
}

function createMemberList() {
  return Array.from({ length: MEMBER_LIMIT }, () => createEmptyMember());
}

function isMemberFilled(member) {
  const normalizedPhone = member.phone.trim();
  return Boolean(member.name.trim() && member.role.trim() && memberPhoneRegex.test(normalizedPhone));
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
  phoneError
}) {
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [activeMemberIndex, setActiveMemberIndex] = useState(0);
  const [members, setMembers] = useState(() => createMemberList());
  const [memberErrors, setMemberErrors] = useState(emptyMemberError);

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

  function goToPreviousMember() {
    setMemberErrors(emptyMemberError);
    setActiveMemberIndex((current) => Math.max(0, current - 1));
  }

  function goToNextMember() {
    const errors = validateMember(activeMember);
    if (hasMemberError(errors)) {
      setMemberErrors(errors);
      return;
    }

    setMemberErrors(emptyMemberError);
    if (activeMemberIndex >= MEMBER_LIMIT - 1) {
      setIsMemberModalOpen(false);
      return;
    }

    setActiveMemberIndex((current) => current + 1);
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
          <div className="priority-tag">អាទិភាពខ្ពស់</div>
        </div>

        <form id="missionForm" onSubmit={handleFormSubmit} onReset={handleFormReset}>
          <div className="phase-grid">
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
                    placeholder="ឧ. 012-345-678"
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
                  <span>តួនាទី</span>
                  <input
                    type="text"
                    name="role"
                    placeholder="ឧ. ប្រធានក្រុម / សមាជិក"
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
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) => onSupportFileChange(event.target.files?.[0] ?? null)}
                  />
                </label>
                {supportFile ? <p className="status">{supportFile.name}</p> : null}
              </div>

              <button className="member-add" type="button" onClick={openMemberModal}>
                បន្ថែមសមាជិក
              </button>
              <p className="status member-status">
                សមាជិកដែលបានបំពេញរួច៖ {filledMemberCount}/{MEMBER_LIMIT}
              </p>
            </section>

            <section className="phase-card phase-request">
              <div className="phase-header">
                <h3>សំណូមពរ</h3>
                <p>សូមបំពេញសំណើរតម្រូវការរបស់មន្រ្តីមុនចេញបេសកកម្ម។</p>
              </div>
              <div className="field-grid">
                <label className="field full request-field">
                  <span>ប្រអប់សំណើរ</span>
                  <textarea
                    name="requestNote"
                    rows="5"
                    placeholder="សូមសរសេរតម្រូវការ ឬសម្ភារៈចាំបាច់សម្រាប់បេសកកម្ម"
                    value={formData.requestNote}
                    onChange={onChange}
                    required
                  />
                </label>
              </div>
            </section>
          </div>

          <div className="signature-preview">
            <div className="signature-line" />
            <div className="signature-label">ហត្ថលេខា លោកអគ្គនាយក (ប្រធានអនុម័ត)</div>
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
                <p>សូមបំពេញព័ត៌មានសមាជិកម្នាក់ម្តង រហូតដល់សរុប ១៥ នាក់។</p>
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
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) => handleMemberSupportFileChange(event.target.files?.[0] ?? null)}
                  />
                </label>
                {activeMember.supportFile ? <p className="status">{activeMember.supportFile.name}</p> : null}
              </div>
            </section>

            <div className="member-modal-footer">
              <div className="member-progress-wrap">
                <strong className="member-progress">
                  ({activeMemberIndex + 1}/{MEMBER_LIMIT})
                </strong>
                <div className="status">បានបំពេញរួច {filledMemberCount} នាក់</div>
              </div>
              <div className="member-modal-actions">
                <button
                  className="ghost member-nav-button"
                  type="button"
                  onClick={goToPreviousMember}
                  disabled={activeMemberIndex === 0}
                >
                  ថយក្រោយ
                </button>
                <button className="primary member-nav-button" type="button" onClick={goToNextMember}>
                  {activeMemberIndex === MEMBER_LIMIT - 1 ? "បញ្ចប់" : "បន្ទាប់"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
