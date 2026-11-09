// Single source of truth for who is logged in (customer or admin).
// The token and user are kept in sessionStorage, or localStorage with "remember me".

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getErrorMessage, loginCustomer, registerCustomer } from "../services/api";
import { TOKEN_KEY, USER_KEY } from "../constants/storageKeys";
import type { AuthUser } from "../types";
import { getStoredItem, removeStoredItem, setStoredItem } from "../utils/storage";

type RegisterData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  agreeToTerms: boolean;
};

interface AuthContextType {
  customer: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  error: string;
  login: (email: string, password: string, options?: { remember?: boolean }) => Promise<AuthUser | null>;
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
    async (email: string, password: string, options?: { remember?: boolean }) => {
      setLoading(true);
      setError("");
      try {
        const res = await loginCustomer(email, password);
        const { token: newToken, customer: user } = res.data;
        const area = options?.remember ? "local" : "session";

        removeStoredItem(TOKEN_KEY);
        removeStoredItem(USER_KEY);
        setStoredItem(TOKEN_KEY, newToken, area);
        setStoredItem(USER_KEY, JSON.stringify(user), area);
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

  // Keep the stored copy in the same storage area it was saved to.
  const updateCustomer = useCallback((user: AuthUser) => {
    const area = localStorage.getItem(USER_KEY) ? "local" : "session";
    setStoredItem(USER_KEY, JSON.stringify(user), area);
    setCustomer(user);
  }, []);

  const logout = useCallback(() => {
    removeStoredItem(TOKEN_KEY);
    removeStoredItem(USER_KEY);
    setToken(null);
    setCustomer(null);
  }, []);

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
