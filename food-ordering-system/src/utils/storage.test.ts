import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { getStoredItem, setStoredItem, removeStoredItem } from "../utils/storage";

describe("Storage Utilities", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("setStoredItem", () => {
    it("stores item in sessionStorage by default", () => {
      setStoredItem("key", "value");
      expect(sessionStorage.getItem("key")).toBe("value");
      expect(localStorage.getItem("key")).toBeNull();
    });

    it("stores item in localStorage when 'local' is specified", () => {
      setStoredItem("key", "value", "local");
      expect(localStorage.getItem("key")).toBe("value");
    });

    it("stores complex data as JSON", () => {
      const data = { name: "Juan", age: 25 };
      setStoredItem("user", JSON.stringify(data), "local");
      expect(JSON.parse(localStorage.getItem("user") || "")).toEqual(data);
    });

    it("overwrites existing values", () => {
      setStoredItem("key", "value1");
      setStoredItem("key", "value2");
      expect(sessionStorage.getItem("key")).toBe("value2");
    });
  });

  describe("getStoredItem", () => {
    it("retrieves item from localStorage", () => {
      localStorage.setItem("key", "value");
      expect(getStoredItem("key")).toBe("value");
    });

    it("retrieves item from sessionStorage", () => {
      sessionStorage.setItem("key", "value");
      expect(getStoredItem("key")).toBe("value");
    });

    it("returns null for non-existent keys", () => {
      expect(getStoredItem("nonexistent")).toBeNull();
    });

    it("checks sessionStorage before localStorage", () => {
      localStorage.setItem("key", "local-value");
      sessionStorage.setItem("key", "session-value");
      expect(getStoredItem("key")).toBe("session-value");
    });
  });

  describe("removeStoredItem", () => {
    it("removes the item from both storages", () => {
      localStorage.setItem("key", "local-value");
      sessionStorage.setItem("key", "session-value");
      removeStoredItem("key");
      expect(localStorage.getItem("key")).toBeNull();
      expect(sessionStorage.getItem("key")).toBeNull();
    });

    it("does nothing if key doesn't exist", () => {
      expect(() => removeStoredItem("nonexistent")).not.toThrow();
    });
  });
});
