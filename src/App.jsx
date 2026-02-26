import { useState } from "react";
import { AdminLoginPage } from "./features/auth";
import { ReportFormPage } from "./features/report-form";

const sessionAuthKey = "mcctv:admin-session-auth";
const rememberAuthKey = "mcctv:admin-remember-auth";
const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "123456"
};

function getInitialAuthState() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.sessionStorage.getItem(sessionAuthKey) === "1" ||
    window.localStorage.getItem(rememberAuthKey) === "1"
  );
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(getInitialAuthState);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  function handleAdminLogin({ username, password, keepSignedIn }) {
  if (
    username !== ADMIN_CREDENTIALS.username ||
    password !== ADMIN_CREDENTIALS.password
  ) {
    return false; // tell login page it failed
  }

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(sessionAuthKey, "1");

    if (keepSignedIn) {
      window.localStorage.setItem(rememberAuthKey, "1");
    } else {
      window.localStorage.removeItem(rememberAuthKey);
    }
  }

  setIsAdmin(true);
  setShowAdminLogin(false);

  return true;
}

  function handleAdminLogout() {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(sessionAuthKey);
      window.localStorage.removeItem(rememberAuthKey);
    }

    setIsAdmin(false);
  }

  if (showAdminLogin) {
    return (
      <AdminLoginPage
        onLogin={handleAdminLogin}
        onCancel={() => setShowAdminLogin(false)}
      />
    );
  }

  return <ReportFormPage isAdmin={isAdmin} onAdminLogin={() => setShowAdminLogin(true)} onAdminLogout={handleAdminLogout} />;
}
