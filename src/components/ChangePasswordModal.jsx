import { useState } from "react";
import { changePassword } from "../api/services";

export default function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("លេខសម្ងាត់ថ្មីមិនដូចគ្នា។");
      return;
    }
    if (newPassword.length < 8) {
      setError("លេខសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៨ តួអក្សរ។");
      return;
    }
    if (currentPassword === newPassword) {
      setError("លេខសម្ងាត់ថ្មីត្រូវខុសពីលេខសម្ងាត់បច្ចុប្បន្ន។");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail === "Current password is incorrect.") {
        setError("លេខសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវ។");
      } else if (detail) {
        setError(detail);
      } else {
        setError("មានបញ្ហា សូមព្យាយាមម្តងទៀត។");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sys-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sys-modal-card" style={{ width: "min(100%, 420px)" }}>
        <div className="sys-modal-header">
          <h3>ផ្លាស់ប្តូរលេខសម្ងាត់</h3>
          <button type="button" className="ghost" onClick={onClose} style={{ fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <div className="sys-modal-body">
          {success ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
              <p style={{ margin: 0, fontFamily: "var(--font-kh-sans)", color: "#2d6a2d", fontWeight: 600 }}>
                លេខសម្ងាត់ត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ។
              </p>
              <button
                type="button"
                className="primary"
                style={{ marginTop: 18, width: "100%" }}
                onClick={onClose}
              >
                បិទ
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="sys-field">
                <span>លេខសម្ងាត់បច្ចុប្បន្ន</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
              <div className="sys-field">
                <span>លេខសម្ងាត់ថ្មី</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
              <div className="sys-field">
                <span>បញ្ជាក់លេខសម្ងាត់ថ្មី</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>

              {error && (
                <p style={{ margin: 0, color: "#c0392b", fontSize: 13, fontFamily: "var(--font-kh-sans)" }}>
                  {error}
                </p>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" className="ghost" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
                  បោះបង់
                </button>
                <button type="submit" className="primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
