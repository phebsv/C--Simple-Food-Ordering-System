import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "./Navbar";

vi.mock("../context/CartContext", () => ({
  useCart: () => ({ itemCount: 2 }),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar title="TEST" showNavLinks />
    </MemoryRouter>,
  );
}

describe("Navbar highlight", () => {
  it("highlights the link for the current page only", () => {
    renderAt("/menu");
    expect(screen.getByRole("link", { name: "Menu" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Menu" })).toHaveClass("nav-link-active");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("keeps Cart highlighted during checkout", () => {
    renderAt("/checkout");
    expect(screen.getByRole("link", { name: /Cart with 2 items/ })).toHaveAttribute("aria-current", "page");
  });

  it("keeps Orders highlighted on the order confirmation page", () => {
    renderAt("/order-confirmation");
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("aria-current", "page");
  });
});
