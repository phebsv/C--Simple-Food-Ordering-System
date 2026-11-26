import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Profile from "./Profile";

const { customer } = vi.hoisted(() => ({
  customer: {
    id: "u1",
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "09171234567",
    address: "",
  },
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ customer, updateCustomer: vi.fn() }),
}));

vi.mock("../../context/CartContext", () => ({
  useCart: () => ({ itemCount: 0 }),
}));

vi.mock("../../services/api", () => ({
  getErrorMessage: (_error: unknown, fallback: string) => fallback,
  getUser: vi.fn(() => new Promise(() => {})), // keep the stored profile
  updateUser: vi.fn(),
  changePassword: vi.fn(),
}));

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );
}

describe("Profile delivery address", () => {
  it("shows a clear placeholder instead of an empty strip when there is no address", () => {
    renderProfile();
    expect(screen.getByText("No delivery address yet")).toHaveClass("profile-value-empty");
  });

  it("uses a one-line address box in edit mode, like the other fields", async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole("button", { name: /Edit Profile/i }));
    const address = screen.getByLabelText("Delivery Address");
    expect(address.tagName).toBe("TEXTAREA");
    expect(address).toHaveAttribute("rows", "1");
    expect(address).toHaveAttribute("placeholder", "House / unit no., street, barangay, city");
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone Number")).toBeInTheDocument();
  });
});
