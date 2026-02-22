export default function ApprovalSection({ isActive }) {
  return (
    <section id="approval" className={`page-section ${isActive ? "active" : ""}`}>
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
  );
}



