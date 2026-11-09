import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import LeftPanel from "../components/LeftPanel";
import BgFood from "../components/BgFood";
import UInput from "../components/UInput";
import RedBtn from "../components/RedBtn";
import { MailIcon, LockIcon } from "../components/UInput";
import { isAdminUser, useAuth } from "../context/AuthContext";
import { validateLoginForm } from "../utils/validationHelpers";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [remember, setRemember] = useState(false);
  const [localError, setLocalError] = useState<string>("");

  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLocalError("");

    const trimmedEmail = email.trim();

    const validation = validateLoginForm({ email: trimmedEmail, password });
    if (!validation.valid) {
      return setLocalError(validation.error || "Validation failed.");
    }

    const user = await login(trimmedEmail, password, { remember });
    if (user) {
      navigate(isAdminUser(user) ? "/admin/dashboard" : "/dashboard");
    }
  };

  const displayError = localError || error;

  return (
    <>
      <Navbar title="LOG IN" />
      <div className="login-container">
        <BgFood />
        <div className="login-card">
          <LeftPanel />
          <div className="login-form">
            <h1 className="login-title">Sign in</h1>
            <p className="login-subtitle">
              If you don't have an account register
            </p>
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="login-register-btn"
            >
              Register here !
            </button>

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (!loading) handleLogin();
              }}
            >
              <div className="login-input-group">
                <UInput
                  label="Email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  Icon={MailIcon}
                />
              </div>
              <UInput
                label="Password"
                type="password"
                placeholder="Enter your Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                Icon={LockIcon}
              />

              <div className="login-options">
                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember me
                </label>
              </div>

              {displayError && <p className="login-error">{displayError}</p>}

              <div className="login-btn-container">
                <RedBtn type="submit" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </RedBtn>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
