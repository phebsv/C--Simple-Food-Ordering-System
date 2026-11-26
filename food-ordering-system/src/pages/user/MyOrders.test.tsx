import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyOrders from "./MyOrders";

const { LONG_ID } = vi.hoisted(() => ({ LONG_ID: "99bc6cb12816410fb0692d81bdd2a4da" }));

vi.mock("../../context/CartContext", () => ({
  useCart: () => ({ itemCount: 0 }),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

vi.mock("../../services/api", () => ({
  getErrorMessage: (_error: unknown, fallback: string) => fallback,
  addReview: vi.fn(),
  getReviews: vi.fn().mockResolvedValue([]),
  getOrders: vi.fn().mockResolvedValue([
    {
      id: LONG_ID,
      orderNumber: 3,
      customerId: "u1",
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      customerPhone: "09171234567",
      customerAddress: "12 Sample Street",
      items: [{ id: "1", name: "Classic Burger", description: "", price: 150, category: "Meals", quantity: 1 }],
      subtotal: 150,
      total: 150,
      status: "Pending",
      paymentMethod: "cash",
      createdAt: "2026-11-27T00:00:00Z",
      updatedAt: "2026-11-27T00:00:00Z",
    },
  ]),
}));

describe("My Orders", () => {
  it("shows the short order number, never the long internal Order ID", async () => {
    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Order #0-03")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(LONG_ID);
    expect(document.body).not.toHaveTextContent(LONG_ID.slice(0, 8));
  });
});
