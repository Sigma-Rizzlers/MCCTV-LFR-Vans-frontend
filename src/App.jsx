import { useState, useEffect } from "react";
import { LoginPage } from "./features/auth";
import { AdminDashboardPage } from "./features/admin-dashboard";
import { SuperAdminDashboardPage } from "./features/super-admin-dashboard";
import { SysManagerDashboardPage } from "./features/sys-manager";
import { ReportFormPage } from "./features/report-form";
import { findAccount, seedDefaultAccounts, recordLastLogin } from "./utils/accountStorage";
import { login as apiLogin } from "./api/services";

seedDefaultAccounts();

const sessionRoleKey = "mcctv:session-role";
const sessionUsernameKey = "mcctv:session-username";
const sessionUnitNameKey = "mcctv:session-unitName";

const roleGuest = "guest";
const roleUser = "user";
const roleAdmin = "admin";
const roleSuperAdmin = "superadmin";
const roleSysManager = "sysmanager";

const sysManagerCredentials = { username: "moi", password: "test" };

const pageLogin = "login";
const pageMain = "main";
const pageAdminDashboard = "admin-dashboard";
const pageSuperAdminDashboard = "super-admin-dashboard";
const pageSysManager = "sys-manager";

function normalizeRole(value) {
  return value === roleUser ||
    value === roleAdmin ||
    value === roleSuperAdmin ||
    value === roleSysManager
    ? value
    : roleGuest;
}

function getInitialAuthRole() {
  if (typeof window === "undefined") return roleGuest;
  return normalizeRole(window.sessionStorage.getItem(sessionRoleKey));
}

function pageForRole(role) {
  if (role === roleAdmin) return pageAdminDashboard;
  if (role === roleSuperAdmin) return pageSuperAdminDashboard;
  if (role === roleSysManager) return pageSysManager;
  if (role === roleUser) return pageMain;
  return pageLogin;
}

export default function App() {
  const [authRole, setAuthRole] = useState(getInitialAuthRole);
  const [activePage, setActivePage] = useState(() => {
    const role = getInitialAuthRole();
    return role === roleGuest ? pageLogin : pageForRole(role);
  });

  function applySession(role, username, unitName = "") {
    window.sessionStorage.setItem(sessionRoleKey, role);
    window.sessionStorage.setItem(sessionUsernameKey, username);
    window.sessionStorage.setItem(sessionUnitNameKey, unitName);
    setAuthRole(role);
    setActivePage(pageForRole(role));
  }

  async function handleLogin({ username, password }) {
    // ── 1. Try the FastAPI backend first ─────────────────────────────────────
    try {
      const res = await apiLogin(username, password);
      const { token, role, unitName } = res.data;
      localStorage.setItem("authToken", token);
      applySession(normalizeRole(role), username, unitName ?? "");
      recordLastLogin(username);
      return true;
    } catch {
      // API unreachable, 401, or network error → fall through to local fallback
    }

    // ── 2. Local fallback (offline / dev / hardcoded sysmanager) ─────────────
    let role = null;

    if (
      username === sysManagerCredentials.username &&
      password === sysManagerCredentials.password
    ) {
      role = roleSysManager;
    } else {
      const account = findAccount(username, password);
      if (account) role = account.role;
    }

    if (!role) return false;

    applySession(role, username, "");
    recordLastLogin(username);
    return true;
  }

  function handleLogout() {
    localStorage.removeItem("authToken");
    window.sessionStorage.removeItem(sessionRoleKey);
    window.sessionStorage.removeItem(sessionUsernameKey);
    window.sessionStorage.removeItem(sessionUnitNameKey);
    setAuthRole(roleGuest);
    setActivePage(pageLogin);
  }

  useEffect(() => {
    function handleAuthLogout() {
      localStorage.removeItem("authToken");
      window.sessionStorage.removeItem(sessionRoleKey);
      window.sessionStorage.removeItem(sessionUsernameKey);
      window.sessionStorage.removeItem(sessionUnitNameKey);
      setAuthRole(roleGuest);
      setActivePage(pageLogin);
    }
    window.addEventListener("auth:logout", handleAuthLogout);
    return () => window.removeEventListener("auth:logout", handleAuthLogout);
  }, []);

  if (activePage === pageLogin || authRole === roleGuest) {
    return <LoginPage title="Mission Request Login" onLogin={handleLogin} />;
  }

  if (authRole === roleSysManager) {
    return <SysManagerDashboardPage onLogout={handleLogout} />;
  }

  if (authRole === roleAdmin) {
    return <AdminDashboardPage onLogout={handleLogout} />;
  }

  if (authRole === roleSuperAdmin) {
    return <SuperAdminDashboardPage onLogout={handleLogout} />;
  }

  if (authRole === roleUser) {
    return (
      <ReportFormPage
        authRole={authRole}
        onAdminLogin={() => setActivePage(pageLogin)}
        onAdminLogout={handleLogout}
        onOpenAdminDashboard={() => setActivePage(pageAdminDashboard)}
      />
    );
  }

  return <LoginPage title="Mission Request Login" onLogin={handleLogin} />;
}
