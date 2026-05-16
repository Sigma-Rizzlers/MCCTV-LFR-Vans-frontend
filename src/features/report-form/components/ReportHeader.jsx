export default function ReportHeader({
  activeSection,
  navItems,
  onSectionChange,
  authRole = "guest",
  onAdminLogin,
  onAdminLogout,
  onOpenAdminDashboard,
  onOpenProfile,
  onOpenMySubmissions
}) {
  const isAuthenticated = authRole !== "guest";
  const isPrivilegedUser = authRole === "admin" || authRole === "super_admin";
  const isStandardUser = authRole === "user";
  const hasNavLinks = Array.isArray(navItems) && navItems.length > 0;
  const dashboardLabel = authRole === "super_admin" ? "Super Admin Dashboard" : "Admin Dashboard";
  const roleLabel =
    authRole === "super_admin"
      ? "Super Admin"
      : authRole === "admin"
        ? "Admin"
        : authRole === "user"
          ? ""
          : "Guest";

  return (
    <header className="topbar report-topbar">
      <div className="report-topbar-shell">
        <nav className={`report-header-nav ${hasNavLinks ? "has-links" : "no-links"}`} aria-label="Primary navigation">
          {hasNavLinks ? (
            <div className="report-header-links">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`report-header-link ${activeSection === item.id ? "active" : ""}`.trim()}
                  onClick={(event) => {
                    event.preventDefault();
                    onSectionChange(item.id);
                  }}
                >
                  {item.label}
                </a>
              ))}
            </div>
          ) : null}

          <div className={`report-header-actions ${hasNavLinks ? "" : "no-links"}`.trim()}>
            {isPrivilegedUser ? (
              <button
                type="button"
                className="admin-access-btn admin"
                onClick={onOpenAdminDashboard}
              >
                {dashboardLabel}
              </button>
            ) : null}

            {isStandardUser && onOpenMySubmissions ? (
              <button type="button" className="admin-access-btn admin" onClick={onOpenMySubmissions}>
                ការបញ្ជូនរបស់ខ្ញុំ
              </button>
            ) : null}
            {isStandardUser && onOpenProfile ? (
              <button type="button" className="admin-access-btn admin" onClick={onOpenProfile}>
                កែប្រែព័ត៌មាន
              </button>
            ) : null}

            {isAuthenticated ? (
              <>
                {roleLabel ? <span className="admin-role-badge">{roleLabel}</span> : null}
                <button
                  type="button"
                  className="admin-access-btn admin"
                  onClick={onAdminLogout}
                >
                  ចាកចេញ
                </button>
              </>
            ) : (
              <button type="button" className="admin-access-btn" onClick={onAdminLogin}>
                ចូលប្រើ
              </button>
            )}
          </div>
        </nav>

        <div className="brand report-brand">
          <div className="brand-main report-brand-main">
            <div className="seal report-seal">
              <img
                className="brand-logo"
                src="/ministry-logo.png"
                alt="Ministry of Interior logo"
                onError={(event) => {
                  event.currentTarget.src = "/logo.png";
                }}
              />
            </div>

            <div className="brand-text report-brand-text">
              <div className="brand-title brand-title-kh ministry-brand-title-kh">ក្រសួងមហាផ្ទៃ</div>
              <div className="brand-title-en brand-title-system">MINISTRY OF INTERIOR</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
