import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../context/AuthContext";

// Mock the API
vi.mock("../services/api", () => ({
  loginCustomer: vi.fn(),
  logoutSession: vi.fn(),
  registerCustomer: vi.fn(),
  getErrorMessage: (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback,
}));

vi.mock("../utils/storage", () => ({
  getStoredItem: vi.fn(() => null),
  setStoredItem: vi.fn(),
  removeStoredItem: vi.fn(),
}));

import { loginCustomer, logoutSession, registerCustomer } from "../services/api";
import { getStoredItem, setStoredItem, removeStoredItem } from "../utils/storage";

const mockLogin = vi.mocked(loginCustomer);
const mockRegister = vi.mocked(registerCustomer);

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStoredItem).mockReturnValue(null);
  });

  it("initializes with null user and token", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.customer).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("handles successful login", async () => {
    const mockUser = { id: "1", email: "user@example.com", role: "user" as const };
    const mockToken = "mock-token";

    mockLogin.mockResolvedValue({
      data: { token: mockToken, customer: mockUser },
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      const user = await result.current.login("user@example.com", "Password123");
      expect(user).toEqual(mockUser);
    });

    await waitFor(() => {
      expect(result.current.customer).toEqual(mockUser);
      expect(result.current.token).toBe(mockToken);
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(setStoredItem).toHaveBeenCalledWith("customerToken", mockToken, "session");
    expect(setStoredItem).toHaveBeenCalledWith("currentUser", JSON.stringify(mockUser), "session");
  });

  it("handles failed login", async () => {
    mockLogin.mockRejectedValue(
      new Error("Invalid credentials")
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      const user = await result.current.login("user@example.com", "WrongPassword");
      expect(user).toBeNull();
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.customer).toBeNull();
  });


  it("handles successful registration", async () => {
    mockRegister.mockResolvedValue({ data: { token: "t", customer: { id: "2" } } });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      const success = await result.current.register({
        firstName: "Juan",
        lastName: "Dela Cruz",
        email: "juan@example.com",
        password: "Password123",
        phoneNumber: "09171234567",
      });
      expect(success).toBe(true);
    });
  });

  it("handles failed registration", async () => {
    mockRegister.mockRejectedValue(
      new Error("Email already exists")
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      const success = await result.current.register({
        firstName: "Juan",
        lastName: "Dela Cruz",
        email: "juan@example.com",
        password: "Password123",
        phoneNumber: "09171234567",
      });
      expect(success).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it("handles logout", () => {
    vi.mocked(getStoredItem).mockImplementation((key) =>
      key === "customerToken" ? "active-token" : JSON.stringify({ id: "1" }),
    );
    vi.mocked(logoutSession).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.customer).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(logoutSession).toHaveBeenCalledWith("active-token");
    expect(removeStoredItem).toHaveBeenCalledWith("customerToken");
    expect(removeStoredItem).toHaveBeenCalledWith("currentUser");
  });

  it("sets error message", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    act(() => {
      result.current.setError("Custom error message");
    });

    expect(result.current.error).toBe("Custom error message");
  });
});
