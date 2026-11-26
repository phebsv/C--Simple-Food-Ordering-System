import { describe, expect, it } from "vitest";
import { formatOrderNumber, matchesOrderNumber } from "./orderHelpers";

describe("formatOrderNumber", () => {
  it("formats small numbers as #0-NN", () => {
    expect(formatOrderNumber({ id: "abc", orderNumber: 1 })).toBe("#0-01");
    expect(formatOrderNumber({ id: "abc", orderNumber: 25 })).toBe("#0-25");
  });

  it("keeps growing past 99 without repeating", () => {
    expect(formatOrderNumber({ id: "abc", orderNumber: 107 })).toBe("#1-07");
    expect(formatOrderNumber({ id: "abc", orderNumber: 1234 })).toBe("#12-34");
  });

  it("falls back to the short id when there is no number", () => {
    expect(formatOrderNumber({ id: "8f3a2b1c9d0e" })).toBe("#8f3a2b1c");
  });
});

describe("matchesOrderNumber", () => {
  it("matches the formatted label, the plain number, and with or without #", () => {
    const order = { orderNumber: 1 };
    expect(matchesOrderNumber(order, "0-01")).toBe(true);
    expect(matchesOrderNumber(order, "#0-01")).toBe(true);
    expect(matchesOrderNumber(order, "1")).toBe(true);
  });

  it("does not match other numbers or text", () => {
    expect(matchesOrderNumber({ orderNumber: 1 }, "0-02")).toBe(false);
    expect(matchesOrderNumber({ orderNumber: 1 }, "juan")).toBe(false);
    expect(matchesOrderNumber({}, "1")).toBe(false);
  });
});
