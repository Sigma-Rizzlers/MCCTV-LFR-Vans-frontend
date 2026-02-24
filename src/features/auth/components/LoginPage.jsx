import { useState } from "react";
import "../styles/login.css";

export default function LoginPage({ onLogin, title = "Sign In", onCancel }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const normalizedUsername = username.trim();

    if (!normalizedUsername || !password) {
      setError("សូមបំពេញឈ្មោះអ្នកប្រើ និងពាក្យសម្ងាត់។");
      return;
    }

    setError("");
    onLogin({ username: normalizedUsername, keepSignedIn });
  }

  return (
    <main className="login-page">
      <section className="login-branding">
        <img src="/mcctv-logo.jpg" alt="General Commissariat of National Police" className="login-brand-logo" />
        <div>
          <h1 className="login-brand-title-kh">អគ្គនាយកដ្ឋានបច្ចេកវិទ្យាឌីជីថល និងផ្សព្វផ្សាយអប់រំ</h1>
          <p className="login-brand-title-en">General Department of Digital Technology and Media</p>
        </div>
      </section>

      <section className="login-card-wrap">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2 className="login-title">{title}</h2>

          <label className="login-label" htmlFor="login-username">Email or Username</label>
          <input
            id="login-username"
            className="login-input"
            placeholder="Enter Email or Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />

          <label className="login-label" htmlFor="login-password">Password</label>
          <div className="login-password-row">
            <input
              id="login-password"
              className="login-input login-input-password"
              placeholder="Enter password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <label className="login-keep">
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(event) => setKeepSignedIn(event.target.checked)}
            />
            <span>keep signed in</span>
          </label>

          {error ? <p className="login-error">{error}</p> : null}

          <button type="submit" className="login-submit">Sign In</button>
          {onCancel ? (
            <button type="button" className="login-cancel" onClick={onCancel}>Back to User Page</button>
          ) : null}
        </form>
      </section>
    </main>
  );
}
