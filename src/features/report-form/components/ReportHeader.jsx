export default function ReportHeader({
  activeSection,
  navItems,
  onSectionChange,
  authRole = "guest",
  onAdminLogin,
  onAdminLogout,
  onOpenAdminDashboard,
  onOpenProfile
}) {
  const isAuthenticated = authRole !== "guest";
  const isPrivilegedUser = authRole === "admin" || authRole === "super_admin";
  const isStandardUser = authRole === "user";
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
    <>
      <header className="topbar">
        <div className="brand">
          <div className="brand-main">
            <div className="seal">
              <img
                className="brand-logo"
                src="/ministry-logo.png"
                alt="Ministry of Interior logo"
                onError={(event) => {
                  event.currentTarget.src = "/mcctv-logo.jpg";
                }}
              />
            </div>
            <div className="brand-text">
              <div className="brand-title brand-title-kh ministry-brand-title-kh">ក្រសួងមហាផ្ទៃ</div>
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
          {isPrivilegedUser ? (
            <button
              type="button"
              className="admin-access-btn admin"
              onClick={onOpenAdminDashboard}
            >
              {dashboardLabel}
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
    </>
  );
}
