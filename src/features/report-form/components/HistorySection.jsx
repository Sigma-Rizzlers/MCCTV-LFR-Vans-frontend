export default function HistorySection({ isActive }) {
  return (
    <section id="history" className={`page-section ${isActive ? "active" : ""}`}>
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
  );
}



