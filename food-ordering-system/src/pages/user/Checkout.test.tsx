import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Checkout from "./Checkout";

const { placeOrderMock } = vi.hoisted(() => ({
  placeOrderMock: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    customer: {
      name: "Jane Doe",
      phone: "09171234567",
      address: "123 Sample Street, Quezon City",
    },
  }),
}));

vi.mock("../../context/CartContext", () => ({
  useCart: () => ({
    items: [{ id: "food-1", name: "Pasta", quantity: 1, price: 250 }],
    total: 250,
    reloadCart: vi.fn(),
  }),
}));

vi.mock("../../services/api", () => ({
  getErrorMessage: (_error: unknown, fallback: string) => fallback,
  placeOrder: placeOrderMock,
}));

describe("Checkout payment methods", () => {
  it("starts without a selected payment method and requires one to place an order", async () => {
    const user = userEvent.setup();
    placeOrderMock.mockClear();

    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/Payment Method/i)).toHaveValue("");
    await user.click(screen.getByRole("button", { name: /Place Order/i }));
    expect(screen.getByText(/Choose a payment method/i)).toBeInTheDocument();
    expect(placeOrderMock).not.toHaveBeenCalled();
  });

  it("validates wallet details and does not include them in the order request", async () => {
    const user = userEvent.setup();
    placeOrderMock.mockResolvedValue({
      id: "order-1",
      items: [],
      createdAt: "2026-11-20T00:00:00Z",
    });

    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>,
    );

    await user.selectOptions(screen.getByLabelText(/Payment Method/i), "gcash");
    expect(screen.getByRole("dialog", { name: /GCash Details/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Registered Wallet Name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/Registered Mobile Number/i), "123");
    await user.click(screen.getByRole("button", { name: /Confirm Details/i }));
    expect(screen.getByText(/11-digit mobile number/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/Registered Mobile Number/i));
    await user.type(screen.getByLabelText(/Registered Mobile Number/i), "09171234567");
    await user.click(screen.getByRole("button", { name: /Confirm Details/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Place Order/i }));
    expect(placeOrderMock).toHaveBeenCalledWith({
      customerName: "Jane Doe",
      customerPhone: "09171234567",
      customerAddress: "123 Sample Street, Quezon City",
      items: [{ id: "food-1", quantity: 1 }],
      paymentMethod: "gcash",
      deliveryNotes: "",
    });
  });

  it("accepts user-entered card details without fixed demo values and excludes them from the order request", async () => {
    const user = userEvent.setup();
    placeOrderMock.mockClear();
    placeOrderMock.mockResolvedValue({
      id: "order-2",
      items: [],
      createdAt: "2026-11-20T00:00:00Z",
    });

    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>,
    );

    await user.selectOptions(screen.getByLabelText(/Payment Method/i), "credit-card");
    expect(screen.getByRole("dialog", { name: /Credit Card Details/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Cardholder Name/i), "Demo User");
    await user.selectOptions(screen.getByLabelText(/Issuing Bank/i), "bpi");
    await user.type(screen.getByLabelText(/^Card Number/i), "5555555555554444");
    expect(screen.getByLabelText(/Expiration Date/i)).toHaveAttribute("type", "date");
    fireEvent.change(screen.getByLabelText(/Expiration Date/i), {
      target: { value: `${new Date().getFullYear() + 2}-12-01` },
    });
    await user.type(screen.getByLabelText(/Security Code/i), "987");
    await user.click(screen.getByRole("button", { name: /Confirm Details/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Place Order/i }));
    expect(placeOrderMock).toHaveBeenCalledWith({
      customerName: "Jane Doe",
      customerPhone: "09171234567",
      customerAddress: "123 Sample Street, Quezon City",
      items: [{ id: "food-1", quantity: 1 }],
      paymentMethod: "credit-card",
      deliveryNotes: "",
    });
  });
});
