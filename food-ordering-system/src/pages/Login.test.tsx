import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Login from "./Login";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    login: vi.fn().mockResolvedValue(null),
    loading: false,
    error: "",
  }),
  isAdminUser: () => false,
}));

describe("Login", () => {
  it("renders login form", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /Sign in/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your Password/i)).toBeInTheDocument();
  });

  it("validates email is required", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText(/Enter your Password/i), "Password123");
    await user.click(screen.getByRole("button", { name: /Login/i }));

    expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
  });

  it("validates password is required", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByPlaceholderText(/Enter your email address/i),
      "juan@example.com",
    );
    await user.click(screen.getByRole("button", { name: /Login/i }));

    expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
  });

  it("validates password strength (must contain letter and number)", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByPlaceholderText(/Enter your email address/i),
      "juan@example.com",
    );
    await user.type(screen.getByPlaceholderText(/Enter your Password/i), "password");
    await user.click(screen.getByRole("button", { name: /Login/i }));

    expect(screen.getByText(/Password must contain at least one number/i)).toBeInTheDocument();
  });

  it("validates password minimum length", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByPlaceholderText(/Enter your email address/i),
      "juan@example.com",
    );
    await user.type(screen.getByPlaceholderText(/Enter your Password/i), "Pass1");
    await user.click(screen.getByRole("button", { name: /Login/i }));

    expect(screen.getByText(/Password must be between 8 and 100 characters/i)).toBeInTheDocument();
  });

  it("accepts valid email and password", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByPlaceholderText(/Enter your email address/i),
      "juan@example.com",
    );
    await user.type(screen.getByPlaceholderText(/Enter your Password/i), "Password123");
    await user.click(screen.getByRole("button", { name: /Login/i }));

    // Should not show error
    expect(screen.queryByText(/required|invalid|must be/i)).not.toBeInTheDocument();
  });



  it("has link to register page", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    const registerLink = screen.getByRole("button", { name: /Register here/i });
    expect(registerLink).toBeInTheDocument();
  });
});

