import { useRef } from "react";

export default function UserProfileSection({
  isActive,
  profileData,
  phoneError,
  statusText,
  onFieldChange,
  onSupportFileChange,
  onClearSupportFile,
  onBack,
  onSubmit
}) {
  const supportFileInputRef = useRef(null);
  const supportFileName = profileData.supportFile?.name || profileData.supportFileName || "";

  function handleClearFile() {
    onClearSupportFile();

    if (supportFileInputRef.current) {
      supportFileInputRef.current.value = "";
    }
  }

  return (
    <section id="profile" className={`page-section ${isActive ? "active" : ""}`}>
      <div className="bundle">
        <div className="bundle-card">
          <div className="bundle-header">
            <div>
              <h2>កែប្រែព័ត៌មានផ្ទាល់ខ្លួន</h2>
            </div>
          </div>

          <form onSubmit={onSubmit}>
            <section className="phase-card phase-personal">
              <div className="field-grid">
                <label className="field full">
                  <span>គោត្តនាម</span>
                  <input
                    type="text"
                    name="name"
                    placeholder="បញ្ចូលឈ្មោះពេញ"
                    value={profileData.name}
                    onChange={onFieldChange}
                    autoComplete="name"
                    required
                  />
                </label>
                <label className="field">
                  <span>លេខទូរស័ព្ទ</span>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="e.g. 012-345-678"
                    value={profileData.phone}
                    onChange={onFieldChange}
                    autoComplete="tel"
                    inputMode="numeric"
                    aria-invalid={phoneError ? "true" : "false"}
                    aria-describedby={phoneError ? "profilePhoneError" : undefined}
                    className={phoneError ? "input-error" : ""}
                    required
                  />
                  {phoneError ? (
                    <p className="field-error" id="profilePhoneError" role="alert">
                      {phoneError}
                    </p>
                  ) : null}
                </label>
                <label className="field">
                  <span>ភេទ</span>
                  <select
                    name="gender"
                    value={profileData.gender}
                    onChange={onFieldChange}
                    autoComplete="sex"
                    required
                  >
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
                    value={profileData.role}
                    onChange={onFieldChange}
                    autoComplete="organization-title"
                    required
                  />
                </label>
              </div>

              <div className="upload-block">
                <div className="upload-label">ឯកសារភ្ជាប់</div>
                <label className="upload-area" htmlFor="profileSupportFile">
                  <span className="upload-icon" aria-hidden="true">
                    ↑
                  </span>
                  <span className="upload-text">បញ្ចូលរូបភាព</span>
                  <input
                    id="profileSupportFile"
                    ref={supportFileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) => onSupportFileChange(event.target.files?.[0] ?? null)}
                  />
                </label>
                {supportFileName ? (
                  <div className="upload-file-actions">
                    <p className="status">{supportFileName}</p>
                    <button className="ghost upload-remove" type="button" onClick={handleClearFile}>
                      លុបរូបភាព
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="actions">
                <button className="primary" type="submit">
                  រក្សាទុក
                </button>
                <button className="ghost" type="button" onClick={onBack}>
                  ត្រឡប់ទៅសំណើ
                </button>
                <div className="status">{statusText}</div>
              </div>
            </section>
          </form>
        </div>
      </div>
    </section>
  );
}
