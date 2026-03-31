import { useState } from "react";
import "../styles/login.css";

export default function LoginPage({
  onLogin,
  title = "Sign In",
  subtitle = "",
  onCancel
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const normalizedUsername = username.trim();

    if (!normalizedUsername || !password) {
      setError("Please enter both username and password.");
      return;
    }

    const success = onLogin({
      username: normalizedUsername,
      password
    });

    if (!success) {
      setError("Invalid credentials.");
      return;
    }

    setError("");
  }

  return (
    <main className="login-page">
      <section className="login-branding">
        <img
          src="/logo.png"
          alt="Ministry of Interior logo"
          className="login-brand-logo"
          onError={(event) => {
            event.currentTarget.src = "/logo.png";
          }}
        />
        <div>
          <h1 className="login-brand-title-kh ministry-brand-title-kh">ក្រសួងមហាផ្ទៃ</h1>
          <p className="login-brand-title-en">MINISTRY OF INTERIOR</p>
        </div>
      </section>

      <section className="login-card-wrap">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2 className="login-title">{title}</h2>
          {subtitle ? <p className="login-subtitle">{subtitle}</p> : null}

          <label className="login-label" htmlFor="login-username">Username</label>
          <input
            id="login-username"
            className="login-input"
            placeholder="Enter username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />

          <label className="login-label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="login-input"
            placeholder="Enter password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />

          {error ? <p className="login-error">{error}</p> : null}

          <button type="submit" className="login-submit">Sign In</button>
          {onCancel ? (
            <button type="button" className="login-cancel" onClick={onCancel}>Back</button>
          ) : null}
        </form>
      </section>
    </main>
  );
}
