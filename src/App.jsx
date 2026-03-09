import { useState } from "react";
import { AdminLoginPage } from "./features/auth";
import { AdminDashboardPage } from "./features/admin-dashboard";
import { SuperAdminDashboardPage } from "./features/super-admin-dashboard";
import { ReportFormPage } from "./features/report-form";

const sessionAuthKey = "mcctv:session-role";
const rememberAuthKey = "mcctv:remember-role";
const pageMain = "main";
const pageAdminLogin = "admin-login";
const pageAdminDashboard = "admin-dashboard";
const pageSuperAdminDashboard = "super-admin-dashboard";
const roleGuest = "guest";
const roleAdmin = "admin";
const roleSuperAdmin = "super_admin";
const credentialsList = [
  { role: roleAdmin, username: "admin", password: "123456" },
  { role: roleSuperAdmin, username: "superadmin", password: "123456" }
];

function normalizeRole(value) {
  return value === roleAdmin || value === roleSuperAdmin ? value : roleGuest;
}

function getInitialAuthRole() {
  if (typeof window === "undefined") {
    return roleGuest;
  }

  const sessionRole = normalizeRole(window.sessionStorage.getItem(sessionAuthKey));
  if (sessionRole !== roleGuest) {
    return sessionRole;
  }

  return normalizeRole(window.localStorage.getItem(rememberAuthKey));
}

export default function App() {
  const [authRole, setAuthRole] = useState(getInitialAuthRole);
  const [activePage, setActivePage] = useState(pageMain);

  function openAdminDashboard() {
    if (authRole === roleAdmin) {
      setActivePage(pageAdminDashboard);
      return;
    }

    if (authRole === roleSuperAdmin) {
      setActivePage(pageSuperAdminDashboard);
      return;
    }

    setActivePage(pageAdminLogin);
  }

  function handleAdminLogin({ username, password, keepSignedIn }) {
    const matchedCredentials = credentialsList.find(
      (item) => item.username === username && item.password === password
    );
    if (!matchedCredentials) {
      return false;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(sessionAuthKey, matchedCredentials.role);

      if (keepSignedIn) {
        window.localStorage.setItem(rememberAuthKey, matchedCredentials.role);
      } else {
        window.localStorage.removeItem(rememberAuthKey);
      }
    }

    setAuthRole(matchedCredentials.role);
    setActivePage(matchedCredentials.role === roleSuperAdmin ? pageSuperAdminDashboard : pageAdminDashboard);

    return true;
  }

  function handleAdminLogout() {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(sessionAuthKey);
      window.localStorage.removeItem(rememberAuthKey);
    }

    setAuthRole(roleGuest);
    setActivePage(pageMain);
  }

  if (activePage === pageAdminLogin) {
    return (
      <AdminLoginPage
        onLogin={handleAdminLogin}
        onCancel={() => setActivePage(pageMain)}
      />
    );
  }

  if (activePage === pageAdminDashboard) {
    if (authRole !== roleAdmin) {
      return (
        <AdminLoginPage
          onLogin={handleAdminLogin}
          onCancel={() => setActivePage(pageMain)}
        />
      );
    }

    return (
      <AdminDashboardPage
        onBackToMain={() => setActivePage(pageMain)}
        onLogout={handleAdminLogout}
      />
    );
  }

  if (activePage === pageSuperAdminDashboard) {
    if (authRole !== roleSuperAdmin) {
      return (
        <AdminLoginPage
          onLogin={handleAdminLogin}
          onCancel={() => setActivePage(pageMain)}
        />
      );
    }

    return (
      <SuperAdminDashboardPage
        onBackToMain={() => setActivePage(pageMain)}
        onLogout={handleAdminLogout}
      />
    );
  }

  return (
    <ReportFormPage
      authRole={authRole}
      onAdminLogin={() => setActivePage(pageAdminLogin)}
      onAdminLogout={handleAdminLogout}
      onOpenAdminDashboard={openAdminDashboard}
    />
  );
}
