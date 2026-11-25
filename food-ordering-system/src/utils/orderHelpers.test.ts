import { describe, expect, it } from "vitest";
import { sortInventoryByPriority } from "./orderHelpers";

describe("sortInventoryByPriority", () => {
  it("orders out-of-stock, low-stock, available, then unavailable items", () => {
    const items = [
      { id: "available", status: "Available" as const },
      { id: "unavailable", status: "Unavailable" as const },
      { id: "low", status: "Low Stock" as const },
      { id: "out", status: "Out of Stock" as const },
    ];

    expect(sortInventoryByPriority(items).map((item) => item.id)).toEqual([
      "out",
      "low",
      "available",
      "unavailable",
    ]);
  });

  it("preserves input order within a status and does not mutate the input", () => {
    const items = [
      { id: "first", status: "Low Stock" as const },
      { id: "second", status: "Low Stock" as const },
      { id: "out", status: "Out of Stock" as const },
    ];

    expect(sortInventoryByPriority(items).map((item) => item.id)).toEqual([
      "out",
      "first",
      "second",
    ]);
    expect(items.map((item) => item.id)).toEqual(["first", "second", "out"]);
  });
});
