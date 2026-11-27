import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Cart from "./Cart";

const { removeItem, updateQuantity, cart } = vi.hoisted(() => ({
  removeItem: vi.fn(),
  updateQuantity: vi.fn(),
  cart: {
    items: [
      { id: "pizza", name: "Pepperoni Pizza", description: "", price: 130, category: "Meals", quantity: 2 },
      { id: "coffee", name: "Iced Coffee", description: "", price: 100, category: "Drinks", quantity: 1 },
    ],
  },
}));

vi.mock("../../context/CartContext", () => ({
  useCart: () => ({ ...cart, total: 360, itemCount: 3, removeItem, updateQuantity }),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

function renderCart() {
  return render(
    <MemoryRouter>
      <Cart />
    </MemoryRouter>,
  );
}

describe("Cart remove confirmation", () => {
  beforeEach(() => {
    removeItem.mockClear();
    updateQuantity.mockClear();
  });

  it("asks before removing, and removes only after confirming", async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    const dialog = screen.getByRole("alertdialog", { name: "Remove item?" });
    expect(dialog).toHaveTextContent("Remove Pepperoni Pizza (x2) from your cart?");
    expect(removeItem).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(removeItem).toHaveBeenCalledWith("pizza");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("keeps the item when the customer cancels", async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(removeItem).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("closes with the Esc key without removing", async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    await user.keyboard("{Escape}");
    expect(removeItem).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("asks when minus would take the quantity from 1 to 0", async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByRole("button", { name: "Decrease Iced Coffee quantity" }));
    expect(updateQuantity).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Remove Iced Coffee (x1)");
  });

  it("lowers the quantity without asking when more than 1 is left", async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByRole("button", { name: "Decrease Pepperoni Pizza quantity" }));
    expect(updateQuantity).toHaveBeenCalledWith("pizza", 1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
