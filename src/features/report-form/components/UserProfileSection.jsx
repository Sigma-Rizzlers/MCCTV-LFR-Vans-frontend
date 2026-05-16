import { useRef, useState, useEffect } from "react";

export default function UserProfileSection({
  isActive,
  savedProfile,
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
  const hasProfile = Boolean(savedProfile?.name);
  const [isEditing, setIsEditing] = useState(!hasProfile);

  useEffect(() => {
    if (statusText === "បានរក្សាទុកព័ត៌មានផ្ទាល់ខ្លួនរួចរាល់") {
      setIsEditing(false);
    }
  }, [statusText]);

  useEffect(() => {
    if (!savedProfile?.name) setIsEditing(true);
  }, [savedProfile?.name]);

  const supportFileName = profileData.supportFile?.name || profileData.supportFileName || "";

  function handleClearFile() {
    onClearSupportFile();
    if (supportFileInputRef.current) supportFileInputRef.current.value = "";
  }

  const genderLabel =
    savedProfile?.gender === "male" ? "ប្រុស" :
    savedProfile?.gender === "female" ? "ស្រី" : "—";

  return (
    <section id="profile" className={`page-section ${isActive ? "active" : ""}`}>
      <div className="bundle">
        <div className="bundle-card">
          <div className="bundle-header">
            <div>
              <h2>ព័ត៌មានផ្ទាល់ខ្លួន</h2>
            </div>
            {!isEditing && (
              <button className="ghost" type="button" onClick={() => setIsEditing(true)}>
                កែប្រែ
              </button>
            )}
          </div>

          {!isEditing ? (
            <div className="profile-view">
              <div className="profile-id-card">
                <div className="profile-id-avatar">
                  <span className="profile-id-avatar-icon">
                    {savedProfile?.gender === "female" ? "👩" : "👤"}
                  </span>
                </div>
                <div className="profile-id-main">
                  <div className="profile-id-name">{savedProfile?.name || "—"}</div>
                  <div className="profile-id-role">{savedProfile?.role || "—"}</div>
                  <div className="profile-id-fields">
                    <div className="profile-id-field">
                      <span className="profile-id-field-label">ភេទ</span>
                      <span className="profile-id-field-value">{genderLabel}</span>
                    </div>
                    <div className="profile-id-field">
                      <span className="profile-id-field-label">លេខទូរស័ព្ទ</span>
                      <span className="profile-id-field-value">{savedProfile?.phone || "—"}</span>
                    </div>
                    {savedProfile?.supportFileName ? (
                      <div className="profile-id-field profile-id-field--full">
                        <span className="profile-id-field-label">រូបប្រវត្តិរូប</span>
                        <span className="profile-id-field-value">{savedProfile.supportFileName}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="actions">
                <button className="ghost" type="button" onClick={onBack}>
                  ត្រឡប់ទៅសំណើ
                </button>
              </div>
            </div>
          ) : (
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
                      <option value="" disabled>ជ្រើសរើសភេទ</option>
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
                  <div className="upload-label">រូបប្រវត្តិរូប</div>
                  <label className="upload-area" htmlFor="profileSupportFile">
                    <span className="upload-icon" aria-hidden="true">↑</span>
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
                      <span className="upload-filename">{supportFileName}</span>
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
                  {hasProfile && (
                    <button className="ghost" type="button" onClick={() => setIsEditing(false)}>
                      បោះបង់
                    </button>
                  )}
                  <button className="ghost" type="button" onClick={onBack}>
                    ត្រឡប់ទៅសំណើ
                  </button>
                  <div className="status">{statusText}</div>
                </div>
              </section>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
