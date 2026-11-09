import { useState } from "react";
import { changePassword, getErrorMessage } from "../services/api";
import { validatePassword, validatePasswordMatch } from "../utils/validationHelpers";

const EMPTY = { current: "", next: "", confirm: "" };

/** "Change Password" section of the profile page. Uses the profile page's styles. */
export default function ChangePassword({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const close = () => {
    setOpen(false);
    setForm(EMPTY);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.current) return setError("Enter your current password.");
    const strength = validatePassword(form.next);
    if (!strength.valid) return setError(strength.error ?? "Password is too weak.");
    const match = validatePasswordMatch(form.next, form.confirm);
    if (!match.valid) return setError(match.error ?? "Passwords do not match.");
    if (form.current === form.next) return setError("New password must be different from the current one.");

    setLoading(true);
    try {
      await changePassword(userId, form.current, form.next);
      close();
      setSuccess("Your password has been changed.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to change password."));
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof typeof EMPTY, label: string, autoComplete: string) => (
    <div className="profile-form-group">
      <label htmlFor={`password-${key}`}>{label}</label>
      <input
        id={`password-${key}`}
        type="password"
        autoComplete={autoComplete}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        disabled={loading}
      />
    </div>
  );

  return (
    <div className="profile-section">
      <h2>Change Password</h2>

      {success && (
        <p role="status" style={{ color: "#2e7d32", fontWeight: 600 }}>
          {success}
        </p>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setSuccess("");
            setOpen(true);
          }}
          className="profile-btn profile-btn-edit"
        >
          Change Password
        </button>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {field("current", "Current Password", "current-password")}
          {field("next", "New Password", "new-password")}
          {field("confirm", "Confirm New Password", "new-password")}
          <p className="profile-hint">At least 8 characters, with a letter and a number.</p>

          {error && <div className="profile-error">{error}</div>}

          <div className="profile-actions">
            <button
              type="button"
              onClick={close}
              disabled={loading}
              className="profile-btn profile-btn-cancel"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="profile-btn profile-btn-save">
              {loading ? "Saving..." : "Update Password"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
