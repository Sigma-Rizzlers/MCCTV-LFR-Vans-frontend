export default function MissionRequestForm({
  formData,
  supportFile,
  statusText,
  onChange,
  onSubmit,
  onReset,
  onSupportFileChange
}) {
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

        <form id="missionForm" onSubmit={onSubmit} onReset={onReset}>
          <div className="phase-grid">
            <section className="phase-card phase-mission">
              <div className="phase-header">
                <h3>ដំណាក់កាលទី១៖ ព័ត៌មានបេសកកម្ម</h3>
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
                <label className="field">
                  <span>រយៈពេល (ថ្ងៃ)</span>
                  <input
                    type="number"
                    name="durationDays"
                    min="1"
                    placeholder="ឧ. ៣"
                    value={formData.durationDays}
                    onChange={onChange}
                  />
                </label>
                <label className="field">
                  <span>រយៈពេល (យប់)</span>
                  <input
                    type="number"
                    name="durationNights"
                    min="0"
                    placeholder="ឧ. ២"
                    value={formData.durationNights}
                    onChange={onChange}
                  />
                </label>
                <label className="field full">
                  <span>ទីកន្លែងបេសកកម្ម</span>
                  <input
                    type="text"
                    name="missionPlace"
                    placeholder="ឧ. ខេត្ត/រាជធានី"
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
                <h3>ដំណាក់កាលទី២៖ ព័ត៌មានផ្ទាល់ខ្លួន</h3>
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
                    placeholder="បញ្ចូលលេខទូរស័ព្ទ"
                    value={formData.phone}
                    onChange={onChange}
                    required
                  />
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

              <button className="member-add" type="button">
                បន្ថែមសមាជិក
              </button>
            </section>

            <section className="phase-card phase-request">
              <div className="phase-header">
                <h3>ដំណាក់កាលទី៣៖ សំណើពរ</h3>
                <p>សូមបំពេញសំណើតម្រូវការរបស់មន្រ្តីមុនចេញបេសកកម្ម។</p>
              </div>
              <div className="field-grid">
                <label className="field full request-field">
                  <span>ប្រអប់សំណើ</span>
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
            <div className="signature-label">តំបន់ហត្ថលេខា អគ្គនាយក (ប្រធានអនុម័ត)</div>
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
    </section>
  );
}



