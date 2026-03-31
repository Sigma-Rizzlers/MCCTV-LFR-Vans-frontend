import { useState } from "react";
import { LoginPage } from "./features/auth";
import { AdminDashboardPage } from "./features/admin-dashboard";
import { SuperAdminDashboardPage } from "./features/super-admin-dashboard";
import { ReportFormPage } from "./features/report-form";

const sessionAuthKey = "mcctv:session-role";
const pageLogin = "login";
const pageMain = "main";
const pageAdminDashboard = "admin-dashboard";
const pageSuperAdminDashboard = "super-admin-dashboard";
const roleGuest = "guest";
const roleUser = "user";
const roleAdmin = "admin";
const roleSuperAdmin = "super_admin";
const credentialsList = [
  { role: roleUser, username: "user", password: "123456" },
  { role: roleAdmin, username: "admin", password: "123456" },
  { role: roleSuperAdmin, username: "superadmin", password: "123456" }
];

function normalizeRole(value) {
  return value === roleUser || value === roleAdmin || value === roleSuperAdmin ? value : roleGuest;
}

function getInitialAuthRole() {
  if (typeof window === "undefined") {
    return roleGuest;
  }

  return normalizeRole(window.sessionStorage.getItem(sessionAuthKey));
}

export default function App() {
  const [authRole, setAuthRole] = useState(getInitialAuthRole);
  const [activePage, setActivePage] = useState(() => {
    const initialRole = getInitialAuthRole();

    if (initialRole === roleAdmin) {
      return pageAdminDashboard;
    }

    if (initialRole === roleSuperAdmin) {
      return pageSuperAdminDashboard;
    }

    return initialRole === roleGuest ? pageLogin : pageMain;
  });

  function openAdminDashboard() {
    if (authRole === roleAdmin) {
      setActivePage(pageAdminDashboard);
      return;
    }

    if (authRole === roleSuperAdmin) {
      setActivePage(pageSuperAdminDashboard);
      return;
    }

    setActivePage(pageMain);
  }

  function handleLogin({ username, password }) {
    const matchedCredentials = credentialsList.find(
      (item) => item.username === username && item.password === password
    );
    if (!matchedCredentials) {
      return false;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(sessionAuthKey, matchedCredentials.role);
    }

    setAuthRole(matchedCredentials.role);
    setActivePage(
      matchedCredentials.role === roleAdmin
        ? pageAdminDashboard
        : matchedCredentials.role === roleSuperAdmin
          ? pageSuperAdminDashboard
          : pageMain
    );

    return true;
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(sessionAuthKey);
    }

    setAuthRole(roleGuest);
    setActivePage(pageLogin);
  }

  if (activePage === pageLogin || authRole === roleGuest) {
    return (
      <LoginPage
        title="Mission Request Login"
        onLogin={handleLogin}
      />
    );
  }

  if (authRole === roleAdmin) {
    return (
      <AdminDashboardPage
        onLogout={handleLogout}
      />
    );
  }

  if (authRole === roleSuperAdmin) {
    return (
      <SuperAdminDashboardPage
        onLogout={handleLogout}
      />
    );
  }

  if (activePage === pageAdminDashboard) {
    if (authRole !== roleAdmin) {
      return (
        <LoginPage
          title="Mission Request Login"
          onLogin={handleLogin}
        />
      );
    }

    return (
      <AdminDashboardPage
        onBackToMain={() => setActivePage(pageMain)}
        onLogout={handleLogout}
      />
    );
  }

  if (activePage === pageSuperAdminDashboard) {
    if (authRole !== roleSuperAdmin) {
      return (
        <LoginPage
          title="Mission Request Login"
          onLogin={handleLogin}
        />
      );
    }

    return (
      <SuperAdminDashboardPage
        onLogout={handleLogout}
      />
    );
  }

  return (
    <ReportFormPage
      authRole={authRole}
      onAdminLogin={() => setActivePage(pageLogin)}
      onAdminLogout={handleLogout}
      onOpenAdminDashboard={openAdminDashboard}
    />
  );
}
