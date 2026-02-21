import { useState } from "react";
import "./ReportFormPage.css";

const initialForm = {
  missionTitle: "",
  departureDate: "",
  returnDate: "",
  durationDays: "",
  durationNights: "",
  missionPlace: "",
  mission: "",
  name: "",
  phone: "",
  role: "",
  requestNote: ""
};

const navItems = [
  { id: "request", label: "ស្នើសុំរថយន្ត" },
  { id: "history", label: "ប្រវត្តិសំណើ" },
  { id: "approval", label: "ការអនុម័ត" },
  { id: "policy", label: "គោលការណ៍" }
];

export default function ReportFormPage() {
  const [activeSection, setActiveSection] = useState("request");
  const [formData, setFormData] = useState(initialForm);
  const [supportFile, setSupportFile] = useState(null);
  const [statusText, setStatusText] = useState("រួចរាល់សម្រាប់បង្កើតឯកសារ PDF");

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setStatusText("បានបញ្ជូនសំណើរបស់អ្នកដោយជោគជ័យ");
  }

  function handleReset() {
    setFormData(initialForm);
    setSupportFile(null);
    setStatusText("រួចរាល់សម្រាប់បង្កើតឯកសារ PDF");
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <div className="seal">
            <img className="brand-logo" src="/mcctv-logo.jpg" alt="MCCTV logo" />
          </div>
          <div className="brand-text">
            <div className="brand-title">អង្គភាពប្រតិបត្តិការ MCCTV</div>
            <div className="brand-subtitle">ប្រព័ន្ធស្នើសុំរថយន្តបេសកកម្មផ្លូវការ</div>
          </div>
        </div>
        <button className="topbar-action" type="button" onClick={() => setActiveSection("request")}>
          មុខងារ
        </button>
      </header>

      <nav className="nav">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={activeSection === item.id ? "active" : ""}
            onClick={(event) => {
              event.preventDefault();
              setActiveSection(item.id);
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <main className="page-main">
        <section id="request" className={`page-section ${activeSection === "request" ? "active" : ""}`}>
          <section className="hero">
            <div className="hero-content">
              <span className="kicker">សេវាកម្មស្នើសុំរថយន្តបេសកកម្ម</span>
              <h1>កញ្ចប់ស្នើសុំរថយន្ត ៣ គ្រឿង (តែមួយជម្រើស)</h1>
              <p>
                ការស្នើសុំមួយលើក គឺស្នើសុំរថយន្តទាំង ៣ គ្រឿងជាកញ្ចប់តែមួយ។ មិនមានជម្រើស ១ ឬ ២
                រថយន្តទេ ដើម្បីធានាការគ្រប់គ្រងបេសកកម្មជារដ្ឋាភិបាល។
              </p>
              <div className="badge-row">
                <span className="badge">អាទិភាពរដ្ឋាភិបាល</span>
                <span className="badge ghost">ប្រើសម្រាប់ការងារផ្លូវការ</span>
              </div>
            </div>
            <div className="hero-stats">
              <div className="stat-card" style={{ "--d": 0 }}>
                <div className="stat-value">3</div>
                <div className="stat-label">ចំនួនរថយន្តក្នុងកញ្ចប់</div>
              </div>
              <div className="stat-card" style={{ "--d": 1 }}>
                <div className="stat-value">5</div>
                <div className="stat-label">មនុស្ស/រថយន្ត (រួមអ្នកបើកបរ)</div>
              </div>
              <div className="stat-card" style={{ "--d": 2 }}>
                <div className="stat-value">15</div>
                <div className="stat-label">សមត្ថភាពសរុប/បេសកកម្ម</div>
              </div>
            </div>
          </section>

          <section className="bundle">
            <div className="bundle-card">
              <div className="bundle-header">
                <div>
                  <h2>ព័ត៌មានកញ្ចប់រថយន្ត</h2>
                  <p>កញ្ចប់នេះរួមមាន ៣ រថយន្ត និងត្រូវស្នើសុំជាកញ្ចប់តែមួយជានិច្ច។</p>
                </div>
                <span className="pill">បង្ខំស្នើ ៣ រថយន្ត</span>
              </div>
              <div className="van-grid">
                <div className="van-item">
                  <h3>រថយន្តដឹកជញ្ជូន</h3>
                  <div className="van-sub">The Transport Van</div>
                  <div className="van-meta">៥ នាក់/រថយន្ត</div>
                </div>
                <div className="van-item">
                  <h3>រថយន្តមេបញ្ជាការ</h3>
                  <div className="van-sub">Commander Van</div>
                  <div className="van-meta">៥ នាក់/រថយន្ត</div>
                </div>
                <div className="van-item">
                  <h3>រថយន្តបច្ចេកទេស</h3>
                  <div className="van-sub">Technical Van</div>
                  <div className="van-meta">៥ នាក់/រថយន្ត</div>
                </div>
              </div>
              <div className="bundle-note">
                សូមចំណាំ៖ ការស្នើសុំរថយន្តមួយលើក គឺស្មើនឹងការស្នើសុំរថយន្តទាំង ៣ គ្រឿង និងមានសមត្ថភាពសរុប
                ១៥ នាក់/បេសកកម្ម (រួមអ្នកបើកបរ ៣ នាក់)។
              </div>
            </div>
          </section>

          <section className="form-section">
            <div className="form-card">
              <div className="form-header">
                <div>
                  <h2>បំពេញសំណើរថ្មី</h2>
                  <p>សូមបំពេញព័ត៌មានខាងក្រោម ដើម្បីបង្កើតសំណើរថយន្តជាឯកសារ PDF។</p>
                </div>
                <div className="priority-tag">អាទិភាពខ្ពស់</div>
              </div>

              <form id="missionForm" onSubmit={handleSubmit} onReset={handleReset}>
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
                          onChange={handleChange}
                          required
                        />
                      </label>
                      <label className="field">
                        <span>ថ្ងៃចេញ</span>
                        <input
                          type="date"
                          name="departureDate"
                          value={formData.departureDate}
                          onChange={handleChange}
                          required
                        />
                      </label>
                      <label className="field">
                        <span>ថ្ងៃត្រឡប់</span>
                        <input
                          type="date"
                          name="returnDate"
                          value={formData.returnDate}
                          onChange={handleChange}
                          required
                        />
                      </label>
                      <label className="field">
                        <span>រយៈពេល (ថ្ងៃ)</span>
                        <input
                          type="number"
                          name="durationDays"
                          min="1"
                          placeholder="ឧ. ៣"
                          value={formData.durationDays}
                          onChange={handleChange}
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
                          onChange={handleChange}
                        />
                      </label>
                      <label className="field full">
                        <span>ទីកន្លែងបេសកកម្ម</span>
                        <input
                          type="text"
                          name="missionPlace"
                          placeholder="ឧ. ខេត្ត/រាជធានី"
                          value={formData.missionPlace}
                          onChange={handleChange}
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
                          onChange={handleChange}
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
                          onChange={handleChange}
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
                          onChange={handleChange}
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
                          onChange={handleChange}
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
                          onChange={(event) => setSupportFile(event.target.files?.[0] ?? null)}
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
                          onChange={handleChange}
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
        </section>

        <section id="history" className={`page-section ${activeSection === "history" ? "active" : ""}`}>
          <div className="section-header">
            <div>
              <h2>ប្រវត្តិសំណើ</h2>
              <p>បញ្ជីសំណើត្រូវបានរក្សាទុកក្នុងឧបករណ៍នេះ ដើម្បីតាមដាន និងបោះពុម្ព។</p>
            </div>
            <button className="ghost" type="button">
              លុបប្រវត្តិ
            </button>
          </div>

          <div className="summary-cards">
            <div className="summary-card">
              <div className="summary-value">0</div>
              <div className="summary-label">សំណើសរុប</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">0</div>
              <div className="summary-label">កំពុងរង់ចាំ</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">0</div>
              <div className="summary-label">អនុម័តរួច</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">0</div>
              <div className="summary-label">បដិសេធ</div>
            </div>
          </div>

          <div className="history-grid">
            <div className="history-card">
              <div className="list-header">
                <h3>បញ្ជីសំណើថ្មីៗ</h3>
                <span className="pill muted">កំណត់ត្រា</span>
              </div>
              <div className="empty">មិនទាន់មានសំណើឡើយ។ សូមបំពេញសំណើថ្មី។</div>
            </div>

            <div className="detail-card">
              <div className="list-header">
                <h3>ព័ត៌មានលម្អិត</h3>
                <span className="pill outline">-</span>
              </div>
              <div className="empty">ជ្រើសរើសសំណើពីបញ្ជីខាងឆ្វេង។</div>
            </div>
          </div>
        </section>

        <section id="approval" className={`page-section ${activeSection === "approval" ? "active" : ""}`}>
          <div className="section-header">
            <div>
              <h2>ការអនុម័ត</h2>
              <p>បញ្ជីសំណើដែលកំពុងរង់ចាំការអនុម័ត និងការបដិសេធ។</p>
            </div>
            <div className="tag-row">
              <div className="tag pending">កំពុងរង់ចាំ: 0</div>
              <div className="tag approved">អនុម័ត: 0</div>
              <div className="tag rejected">បដិសេធ: 0</div>
            </div>
          </div>

          <div className="empty">មិនមានសំណើកំពុងរង់ចាំទេ។</div>
        </section>

        <section id="policy" className={`page-section ${activeSection === "policy" ? "active" : ""}`}>
          <div className="policy-layout">
            <div className="policy-block">
              <h2>គោលការណ៍សេវាកម្ម</h2>
              <p>
                ប្រព័ន្ធស្នើសុំរថយន្តបេសកកម្មនេះបង្កើតឡើងដើម្បីសម្របសម្រួលការងារផ្លូវការ
                និងការត្រួតពិនិត្យការប្រើប្រាស់រថយន្តក្នុងលក្ខខណ្ឌរដ្ឋាភិបាល។
              </p>
              <div className="policy-highlight">
                សំណើមួយគឺស្មើនឹងការស្នើសុំរថយន្ត ៣ គ្រឿង ហើយត្រូវបានចាត់ទុកជាបេសកកម្មអាទិភាព។
              </div>
            </div>
            <div className="policy-block">
              <h3>លំហាត់ការងារ</h3>
              <ol className="policy-steps">
                <li>បំពេញព័ត៌មានស្នើសុំរថយន្តក្នុងទម្រង់។</li>
                <li>ប្រព័ន្ធបង្កើត PDF និងរក្សាទុកសំណើក្នុងប្រវត្តិ។</li>
                <li>ប្រធានអនុម័តពិនិត្យ និងសម្រេចលើសំណើ។</li>
                <li>បន្ទាប់ពីអនុម័ត អ្នកអាចទាញយកឯកសារ PDF សម្រាប់ការបោះពុម្ព។</li>
              </ol>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">© 2026 អង្គភាពប្រតិបត្តិការ MCCTV - ប្រព័ន្ធស្នើសុំរថយន្តបេសកកម្ម</footer>

      <div id="pdfTemplate" className="pdf-template" aria-hidden="true">
        <div className="pdf-header">
          <div className="pdf-seal">
            <img className="pdf-logo" src="/mcctv-logo.jpg" alt="MCCTV logo" />
          </div>
          <div>
            <div className="pdf-title">សំណើរថយន្តបេសកកម្ម (កញ្ចប់ ៣ រថយន្ត)</div>
            <div className="pdf-subtitle">អង្គភាពប្រតិបត្តិការ MCCTV</div>
          </div>
          <div className="pdf-date">កាលបរិច្ឆេទ៖ -</div>
        </div>
      </div>
    </div>
  );
}
