import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Navbar from "../../components/Navbar";
import BgFood from "../../components/BgFood";
import ChangePassword from "../../components/ChangePassword";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage, getUser, updateUser } from "../../services/api";
import type { AuthUser } from "../../types";
import { validatePhoneNumber } from "../../utils/validationHelpers";
import "./Profile.css";

export default function Profile() {
  const { customer, updateCustomer } = useAuth();
  // Route guard guarantees a logged-in customer here.
  const currentUser = customer as AuthUser;

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(currentUser.name ?? "");
  const [phone, setPhone] = useState(currentUser.phone ?? "");
  const [address, setAddress] = useState(currentUser.address ?? "");
  const email = currentUser.email ?? "";
  const addressRef = useRef<HTMLTextAreaElement>(null);

  // The address box starts as tall as the other fields and only grows when the
  // address actually needs more lines.
  useLayoutEffect(() => {
    const box = addressRef.current;
    if (!box) return;
    box.style.height = "auto";
    // scrollHeight leaves out the border, so add it back to avoid clipping the last line.
    const border = box.offsetHeight - box.clientHeight;
    box.style.height = `${box.scrollHeight + border}px`;
  }, [address, isEditing]);

  const resetForm = (user: AuthUser) => {
    setName(user.name ?? "");
    setPhone(user.phone ?? "");
    setAddress(user.address ?? "");
  };

  // Refresh from the server once, in case the profile changed elsewhere.
  useEffect(() => {
    let cancelled = false;
    getUser(currentUser.id)
      .then((fresh) => {
        if (cancelled) return;
        updateCustomer({ ...currentUser, ...fresh });
        resetForm(fresh);
      })
      .catch(() => {
        // Keep the stored copy if the server can't be reached.
      });
    return () => {
      cancelled = true;
    };
    // Only on first load for this user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  const handleSaveChanges = async () => {
    setError("");

    if (!name.trim()) return setError("Name is required");
    const phoneCheck = validatePhoneNumber(phone);
    if (!phoneCheck.valid) return setError(phoneCheck.error ?? "Phone number is invalid");
    if (!address.trim()) return setError("Address is required");

    setLoading(true);
    try {
      const saved = await updateUser(currentUser.id, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      updateCustomer({ ...currentUser, ...saved });
      setIsEditing(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update profile"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar title="PROFILE" showNavLinks={true} />
      <div className="profile-container">
        <BgFood />
        <div className="profile-content">
          <h1 className="profile-title">My Profile</h1>

          <div className="profile-card">
            <div className="profile-section">
              <h2>Account Information</h2>

              <div className="profile-form-group">
                <label htmlFor="profile-name">Full Name</label>
                {isEditing ? (
                  <input
                    id="profile-name"
                    type="text"
                    placeholder="Juan Dela Cruz"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                ) : (
                  <ProfileValue id="profile-name" value={name} emptyText="No name yet" />
                )}
              </div>

              <div className="profile-form-group">
                <label htmlFor="profile-email">Email</label>
                <ProfileValue id="profile-email" value={email} emptyText="No email" />
                <p className="profile-hint">Email cannot be changed</p>
              </div>

              <div className="profile-form-group">
                <label htmlFor="profile-phone">Phone Number</label>
                {isEditing ? (
                  <input
                    id="profile-phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="0917 123 4567"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                  />
                ) : (
                  <ProfileValue id="profile-phone" value={phone} emptyText="No phone number yet" />
                )}
              </div>

              <div className="profile-form-group">
                <label htmlFor="profile-address">Delivery Address</label>
                {isEditing ? (
                  <textarea
                    id="profile-address"
                    ref={addressRef}
                    rows={1}
                    placeholder="House / unit no., street, barangay, city"
                    autoComplete="street-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={loading}
                  />
                ) : (
                  <ProfileValue
                    id="profile-address"
                    value={address}
                    emptyText="No delivery address yet"
                  />
                )}
                <p className="profile-hint">
                  {isEditing
                    ? "Include house number, street, barangay and city."
                    : "Used to fill in your address at checkout"}
                </p>
              </div>

              {error && <div className="profile-error">{error}</div>}

              <div className="profile-actions">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="profile-btn profile-btn-edit"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        resetForm(currentUser);
                        setError("");
                      }}
                      disabled={loading}
                      className="profile-btn profile-btn-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      disabled={loading}
                      className="profile-btn profile-btn-save"
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="profile-divider"></div>

            <ChangePassword userId={currentUser.id} />
          </div>
        </div>
      </div>
    </>
  );
}

/** A read-only profile field, the same size as an input; shows a hint when empty. */
function ProfileValue({ id, value, emptyText }: { id: string; value: string; emptyText: string }) {
  const empty = !value.trim();
  return (
    <div id={id} className={`profile-value${empty ? " profile-value-empty" : ""}`}>
      {empty ? emptyText : value}
    </div>
  );
}
