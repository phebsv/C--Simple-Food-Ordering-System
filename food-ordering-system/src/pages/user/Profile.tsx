import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import BgFood from "../../components/BgFood";
import ChangePassword from "../../components/ChangePassword";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage, getUser, updateUser } from "../../services/api";
import type { AuthUser } from "../../types";
import { validatePhoneNumber } from "../../utils/validationHelpers";
import "./Profile.css";

export default function Profile() {
  const { customer, updateCustomer, logout } = useAuth();
  const navigate = useNavigate();
  // Route guard guarantees a logged-in customer here.
  const currentUser = customer as AuthUser;

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(currentUser.name ?? "");
  const [phone, setPhone] = useState(currentUser.phone ?? "");
  const [address, setAddress] = useState(currentUser.address ?? "");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const email = currentUser.email ?? "";

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

  const handleLogout = () => {
    logout();
    navigate("/login");
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
                <label>Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                ) : (
                  <div className="profile-value">{name}</div>
                )}
              </div>

              <div className="profile-form-group">
                <label>Email</label>
                <div className="profile-value">{email}</div>
                <p className="profile-hint">Email cannot be changed</p>
              </div>

              <div className="profile-form-group">
                <label>Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                  />
                ) : (
                  <div className="profile-value">{phone}</div>
                )}
              </div>

              <div className="profile-form-group">
                <label>Delivery Address</label>
                {isEditing ? (
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={loading}
                    rows={3}
                  />
                ) : (
                  <div className="profile-value">{address}</div>
                )}
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

            <div className="profile-divider"></div>

            <div className="profile-section">
              <h2>Account Actions</h2>

              {!showLogoutConfirm ? (
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="profile-btn profile-btn-logout"
                >
                  Logout
                </button>
              ) : (
                <div className="logout-confirm">
                  <p>Are you sure you want to logout?</p>
                  <div className="confirm-buttons">
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="confirm-btn confirm-btn-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLogout}
                      className="confirm-btn confirm-btn-logout"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
