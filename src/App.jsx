import { useState, useEffect, useRef } from "react";
import { LoginPage } from "./features/auth";
import { AdminDashboardPage } from "./features/admin-dashboard";
import { SuperAdminDashboardPage } from "./features/super-admin-dashboard";
import { SysManagerDashboardPage } from "./features/sys-manager";
import { ReportFormPage } from "./features/report-form";
import { findAccount, seedDefaultAccounts, recordLastLogin } from "./utils/accountStorage";
import { login as apiLogin, getMe } from "./api/services";
import { startConnectionMonitor, stopConnectionMonitor } from "./utils/connectionMonitor";
import { ApiStatusContext } from "./context/ApiStatusContext";
import { DATA_MODE } from "./utils/dataMode";

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

function getInitialValidating() {
  if (typeof window === "undefined") return false;
  if (DATA_MODE === "local") return false;
  return Boolean(localStorage.getItem("authToken"));
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
  const [apiOnline, setApiOnline] = useState(true);
  const [validating, setValidating] = useState(getInitialValidating);
  const monitorRef = useRef(null);

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

  useEffect(() => {
    if (!validating) return;
    getMe()
      .then((res) => {
        const { role, username, unitName } = res.data;
        const validRole = normalizeRole(role);
        window.sessionStorage.setItem(sessionRoleKey, validRole);
        window.sessionStorage.setItem(sessionUsernameKey, username ?? "");
        window.sessionStorage.setItem(sessionUnitNameKey, unitName ?? "");
        setAuthRole(validRole);
        setActivePage(pageForRole(validRole));
      })
      .catch(() => {
        localStorage.removeItem("authToken");
        window.sessionStorage.removeItem(sessionRoleKey);
        window.sessionStorage.removeItem(sessionUsernameKey);
        window.sessionStorage.removeItem(sessionUnitNameKey);
        setAuthRole(roleGuest);
        setActivePage(pageLogin);
      })
      .finally(() => setValidating(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (DATA_MODE === "local") return;
    function handleOnline() { setApiOnline(true); }
    function handleOffline() { setApiOnline(false); }
    window.addEventListener("api:online", handleOnline);
    window.addEventListener("api:offline", handleOffline);
    monitorRef.current = startConnectionMonitor();
    return () => {
      window.removeEventListener("api:online", handleOnline);
      window.removeEventListener("api:offline", handleOffline);
      stopConnectionMonitor(monitorRef.current);
    };
  }, []);

  if (validating) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#f9f7f3", color: "#888", fontSize: 15
      }}>
        កំពុងផ្ទៀងផ្ទាត់...
      </div>
    );
  }

  if (activePage === pageLogin || authRole === roleGuest) {
    return <LoginPage title="Mission Request Login" onLogin={handleLogin} />;
  }

  let page;
  if (authRole === roleSysManager) {
    page = <SysManagerDashboardPage onLogout={handleLogout} />;
  } else if (authRole === roleAdmin) {
    page = <AdminDashboardPage onLogout={handleLogout} />;
  } else if (authRole === roleSuperAdmin) {
    page = <SuperAdminDashboardPage onLogout={handleLogout} />;
  } else if (authRole === roleUser) {
    page = (
      <ReportFormPage
        authRole={authRole}
        onAdminLogin={() => setActivePage(pageLogin)}
        onAdminLogout={handleLogout}
        onOpenAdminDashboard={() => setActivePage(pageAdminDashboard)}
      />
    );
  } else {
    page = <LoginPage title="Mission Request Login" onLogin={handleLogin} />;
  }

  return (
    <ApiStatusContext.Provider value={apiOnline}>
      {page}
    </ApiStatusContext.Provider>
  );
}
