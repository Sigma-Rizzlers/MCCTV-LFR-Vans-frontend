import MissionRequestForm from "./MissionRequestForm";

export default function RequestSection({ isActive, formProps }) {
  return (
    <section id="request" className={`page-section ${isActive ? "active" : ""}`}>
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
            សូមចំណាំ៖ ការស្នើសុំរថយន្តមួយលើក គឺស្មើនឹងការស្នើសុំរថយន្តទាំង ៣ គ្រឿង និងមានសមត្ថភាពសរុប ១៥
            នាក់/បេសកកម្ម (រួមអ្នកបើកបរ ៣ នាក់)។
          </div>
        </div>
      </section>

      <MissionRequestForm {...formProps} />
    </section>
  );
}
