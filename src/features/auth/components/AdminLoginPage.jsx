import LoginPage from "./LoginPage";

export default function AdminLoginPage({ onLogin, onCancel }) {
  return (
    <LoginPage
      title="Admin Login"
      onLogin={onLogin}
      onCancel={onCancel}
    />
  );
}
