export default function ReportHeader({
  activeSection,
  navItems,
  onSectionChange,
  authRole = "guest",
  onAdminLogin,
  onAdminLogout,
  onOpenAdminDashboard
}) {
  const isAuthenticated = authRole === "admin" || authRole === "super_admin";
  const dashboardLabel = authRole === "super_admin" ? "Super Admin Dashboard" : "Admin Dashboard";

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div className="brand-main">
            <div className="seal">
              <img className="brand-logo" src="/ministry-logo.png" alt="Ministry of Interior logo" onError={(event) => {
                event.currentTarget.src = "/mcctv-logo.jpg";
              }} />
            </div>
            <div className="brand-text">
              <div className="brand-title brand-title-kh">ក្រសួងមហាផ្ទៃ</div>
              <div className="brand-title-en brand-title-system">MINISTRY OF INTERIOR</div>
            </div>
              
            </div>
          </div>
          <div className="brand-title-en brand-title-sub"></div>
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
        <div className="admin-actions">
          {isAuthenticated ? (
            <>
              <button
                type="button"
                className="admin-access-btn admin"
                onClick={onOpenAdminDashboard}
              >
                {dashboardLabel}
              </button>
              <button type="button" className="admin-access-btn admin" onClick={onAdminLogout}>
                Admin Logout
              </button>
            </>
          ) : (
            <button type="button" className="admin-access-btn" onClick={onAdminLogin}>
              Admin Login
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
