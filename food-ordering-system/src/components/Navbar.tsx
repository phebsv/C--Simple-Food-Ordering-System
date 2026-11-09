import { Link, useNavigate } from "react-router-dom";
import C from "../constants/colors";
import NomNomLogo from "./NomNomLogo";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

interface NavbarProps {
  title: string;
  showNavLinks?: boolean;
}

const linkStyle = { textDecoration: "none", color: C.text, fontWeight: 600, fontSize: 14 };

const NAV_LINKS = [
  { to: "/dashboard", label: "Home" },
  { to: "/menu", label: "Menu" },
  { to: "/cart", label: "Cart" },
  { to: "/my-orders", label: "Orders" },
  { to: "/profile", label: "Profile" },
];

function NavLinks() {
  const { itemCount: cartItemCount } = useCart();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
      {NAV_LINKS.map(({ to, label }) =>
        to === "/cart" ? (
          <Link
            key={to}
            to={to}
            style={{ ...linkStyle, display: "inline-flex", alignItems: "center", gap: 6 }}
            aria-label={`Cart with ${cartItemCount} item${cartItemCount === 1 ? "" : "s"}`}
          >
            {label}
            {cartItemCount > 0 && (
              <span
                style={{
                  minWidth: 20,
                  height: 20,
                  padding: "0 6px",
                  borderRadius: 999,
                  background: "var(--red)",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {cartItemCount > 99 ? "99+" : cartItemCount}
              </span>
            )}
          </Link>
        ) : (
          <Link key={to} to={to} style={linkStyle}>
            {label}
          </Link>
        ),
      )}
      <button
        onClick={handleLogout}
        style={{
          background: "var(--red)",
          color: "white",
          border: "none",
          padding: "8px 16px",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Logout
      </button>
    </nav>
  );
}

export default function Navbar({ title, showNavLinks = false }: NavbarProps) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, height: 64,
      background: C.white, display: "flex", alignItems: "center",
      padding: "0 2rem", gap: "1.2rem", zIndex: 100,
      boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
      justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
        <NomNomLogo size="sm" />
        <div style={{ width: 1, height: 30, background: "#E0D0D0" }} />
        <span style={{
          fontSize: 22, fontWeight: 900, color: C.text,
          letterSpacing: "2px", textTransform: "uppercase",
          fontFamily: "'Arial Black', Arial, sans-serif",
        }}>{title}</span>
      </div>
      {showNavLinks && <NavLinks />}
    </div>
  );
}
