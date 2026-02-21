export default function ReportHeader({ activeSection, navItems, onSectionChange }) {
  return (
    <>
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
      </header>

      <nav className="nav">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={activeSection === item.id ? "active" : ""}
            onClick={(event) => {
              event.preventDefault();
              onSectionChange(item.id);
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </>
  );
}
