import { useState } from "react";
import "../styles/login.css";

export default function AdminLoginPage({ onLogin, onCancel }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const normalizedUsername = username.trim();

    if (!normalizedUsername || !password) {
      setError("Please enter username and password.");
      return;
    }

    setError("");
    onLogin({ username: normalizedUsername, keepSignedIn });
  }

  return (
    <main className="login-page">
      <section className="login-card-wrap">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2 className="login-title">Admin Sign In</h2>

          <label className="login-label" htmlFor="admin-username">Username</label>
          <input
            id="admin-username"
            className="login-input"
            placeholder="Enter username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />

          <label className="login-label" htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            className="login-input"
            placeholder="Enter password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />

          <label className="login-keep">
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(event) => setKeepSignedIn(event.target.checked)}
            />
            <span>Keep signed in</span>
          </label>

          {error ? <p className="login-error">{error}</p> : null}

          <button type="submit" className="login-submit">Sign In</button>
          <button type="button" className="login-cancel" onClick={onCancel}>Back</button>
        </form>
      </section>
    </main>
  );
}
