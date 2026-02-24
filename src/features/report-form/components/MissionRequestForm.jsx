import { useRef, useState } from "react";

const MEMBER_LIMIT = 14;
const memberPhoneRegex = /^(?:0\d{8,9}|0\d{2}-\d{3}-\d{3,4})$/;
const emptyMemberError = { full_name: "", phone_number: "", job_position: "" };

function createEmptyMember() {
  return {
    full_name: "",
    phone_number: "",
    job_position: "",
    supportFile: null
  };
}

function createMemberList() {
  return Array.from({ length: MEMBER_LIMIT }, () => createEmptyMember());
}

function isMemberFilled(member) {
  const normalizedPhone = member.phone_number.trim();
  return Boolean(member.full_name.trim() && member.job_position.trim() && memberPhoneRegex.test(normalizedPhone));
}

function validateMember(member) {
  const errors = { ...emptyMemberError };
  const normalizedPhone = member.phone_number.trim();

  if (!member.full_name.trim()) {
    errors.full_name = "សូមបញ្ចូលគោត្តនាមសមាជិក។";
  }

  if (!normalizedPhone) {
    errors.phone_number = "សូមបញ្ចូលលេខទូរស័ព្ទសមាជិក។";
  } else if (!memberPhoneRegex.test(normalizedPhone)) {
    errors.phone_number = "លេខទូរស័ព្ទមិនត្រឹមត្រូវ។ សូមប្រើ 012-345-678 ឬ 012-345-6789។";
  }

  if (!member.job_position.trim()) {
    errors.job_position = "សូមបញ្ចូលតួនាទីសមាជិក។";
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

    if (name === "phone_number") {
      const trimmedPhone = value.trim();
      setMemberErrors((current) => ({
        ...current,
        phone_number: !trimmedPhone || memberPhoneRegex.test(trimmedPhone) ? "" : "លេខទូរស័ព្ទមិនត្រឹមត្រូវ។"
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
                    name="mission_title"
                    placeholder="បញ្ចូលឈ្មោះបេសកកម្ម"
                    value={formData.mission_title}
                    onChange={onChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>ថ្ងៃចេញ</span>
                  <input type="date" name="pickup_date" value={formData.pickup_date} onChange={onChange} required />
                </label>
                <label className="field">
                  <span>ថ្ងៃត្រឡប់</span>
                  <input type="date" name="return_date" value={formData.return_date} onChange={onChange} required />
                </label>
                <label className="field full">
                  <span>ទីកន្លែងបេសកកម្ម</span>
                  <input
                    type="text"
                    name="stops"
                    placeholder="ឧ. ខេត្ត/រាជធានី, ភូមិ, ឃុំ/សង្កាត់, ស្រុក/ខណ្ឌ"
                    value={formData.stops}
                    onChange={onChange}
                    required
                  />
                </label>
                <label className="field full">
                  <span>សេចក្ដីពណ៌នាបេសកកម្ម</span>
                  <textarea
                    name="reason"
                    rows="4"
                    placeholder="ពិពណ៌នាគោលបំណង កាលបរិច្ឆេទ និងតំបន់បេសកកម្ម"
                    value={formData.reason}
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
                    name="fullname"
                    placeholder="បញ្ចូលឈ្មោះពេញ"
                    value={formData.fullname}
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
                    name="job_position"
                    placeholder="ឧ. ប្រធានក្រុម / សមាជិក"
                    value={formData.job_position}
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

            <section className="phase-card phase-request">
              <div className="phase-header">
                <h3>សំណូមពរ</h3>
                <p>សូមបំពេញសំណើរតម្រូវការរបស់មន្រ្តីមុនចេញបេសកកម្ម។</p>
              </div>
              <div className="field-grid">
                <label className="field full request-field">
                  <span>ប្រអប់សំណើរ</span>
                  <textarea
                    name="request_note"
                    rows="5"
                    placeholder="សូមសរសេរតម្រូវការ ឬសម្ភារៈចាំបាច់សម្រាប់បេសកកម្ម"
                    value={formData.request_note}
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
                <p>សូមបំពេញព័ត៌មានសមាជិកម្នាក់ម្តង រហូតដល់សរុប ១៤ នាក់ (មិនរាប់អ្នកស្នើសុំ)។</p>
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
                    name="full_name"
                    placeholder="បញ្ចូលឈ្មោះពេញ"
                    value={activeMember.full_name}
                    onChange={handleMemberChange}
                    className={memberErrors.full_name ? "input-error" : ""}
                    required
                  />
                  {memberErrors.full_name ? <p className="field-error">{memberErrors.full_name}</p> : null}
                </label>
                <label className="field">
                  <span>លេខទូរស័ព្ទ</span>
                  <input
                    type="tel"
                    name="phone_number"
                    placeholder="ឧ. 012-345-678"
                    value={activeMember.phone_number}
                    onChange={handleMemberChange}
                    autoComplete="tel"
                    inputMode="numeric"
                    className={memberErrors.phone_number ? "input-error" : ""}
                    required
                  />
                  {memberErrors.phone_number ? <p className="field-error">{memberErrors.phone_number}</p> : null}
                </label>
                <label className="field">
                  <span>តួនាទី</span>
                  <input
                    type="text"
                    name="job_position"
                    placeholder="ឧ. មន្រ្តីប្រតិបត្តិ / សមាជិក"
                    value={activeMember.job_position}
                    onChange={handleMemberChange}
                    className={memberErrors.job_position ? "input-error" : ""}
                    required
                  />
                  {memberErrors.job_position ? <p className="field-error">{memberErrors.job_position}</p> : null}
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





