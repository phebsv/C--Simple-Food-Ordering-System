// Single source of truth for who is logged in (customer or admin).
// The token and user are kept in sessionStorage, so closing the browser logs you out.

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getErrorMessage, loginCustomer, logoutSession, registerCustomer } from "../services/api";
import { TOKEN_KEY, USER_KEY } from "../constants/storageKeys";
import type { AuthUser } from "../types";
import { getStoredItem, removeStoredItem, setStoredItem } from "../utils/storage";

type RegisterData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
};

interface AuthContextType {
  customer: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<AuthUser | null>;
  register: (data: RegisterData) => Promise<boolean>;
  updateCustomer: (user: AuthUser) => void;
  logout: () => void;
  setError: (msg: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function readStoredUser(): AuthUser | null {
  const raw = getStoredItem(USER_KEY);
  if (!raw || !getStoredItem(TOKEN_KEY)) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function isAdminUser(user: AuthUser | null | undefined) {
  return user?.role === "admin" || user?.isAdmin === true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Restore the session synchronously so protected routes never flash a redirect.
  const [customer, setCustomer] = useState<AuthUser | null>(readStoredUser);
  const [token, setToken] = useState<string | null>(() =>
    readStoredUser() ? getStoredItem(TOKEN_KEY) : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await loginCustomer(email, password);
        const { token: newToken, customer: user } = res.data;
        removeStoredItem(TOKEN_KEY);
        removeStoredItem(USER_KEY);
        setStoredItem(TOKEN_KEY, newToken, "session");
        setStoredItem(USER_KEY, JSON.stringify(user), "session");
        setToken(newToken);
        setCustomer(user);
        return user;
      } catch (err) {
        setError(getErrorMessage(err, "Invalid email or password."));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const register = useCallback(async (data: RegisterData) => {
    setLoading(true);
    setError("");
    try {
      await registerCustomer({
        name: `${data.firstName} ${data.lastName}`.trim(),
        email: data.email,
        password: data.password,
        phone: data.phoneNumber,
      });
      return true;
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed."));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCustomer = useCallback((user: AuthUser) => {
    setStoredItem(USER_KEY, JSON.stringify(user), "session");
    setCustomer(user);
  }, []);

  const logout = useCallback(() => {
    // The API client gets the current session token before browser storage is cleared.
    if (token) void logoutSession(token).catch(() => {});
    removeStoredItem(TOKEN_KEY);
    removeStoredItem(USER_KEY);
    setToken(null);
    setCustomer(null);
  }, [token]);

  const value = useMemo(
    () => ({
      customer,
      token,
      isAuthenticated: !!token,
      isAdmin: !!token && isAdminUser(customer),
      loading,
      error,
      login,
      register,
      updateCustomer,
      logout,
      setError,
    }),
    [customer, token, loading, error, login, register, updateCustomer, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
