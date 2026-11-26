import { Link, useLocation, useNavigate } from "react-router-dom";
import C from "../constants/colors";
import NomNomLogo from "./NomNomLogo";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

interface NavbarProps {
  title: string;
  showNavLinks?: boolean;
}

// `alsoActiveOn` keeps a tab highlighted on the pages that belong to it,
// e.g. Checkout is part of the Cart flow.
const NAV_LINKS: { to: string; label: string; alsoActiveOn: string[] }[] = [
  { to: "/dashboard", label: "Home", alsoActiveOn: [] },
  { to: "/menu", label: "Menu", alsoActiveOn: [] },
  { to: "/cart", label: "Cart", alsoActiveOn: ["/checkout"] },
  { to: "/my-orders", label: "Orders", alsoActiveOn: ["/order-confirmation"] },
  { to: "/profile", label: "Profile", alsoActiveOn: [] },
];

function NavLinks() {
  const { itemCount: cartItemCount } = useCart();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="nav-links" aria-label="Main">
      {NAV_LINKS.map(({ to, label, alsoActiveOn }) => {
        const active = pathname === to || alsoActiveOn.includes(pathname);
        const isCart = to === "/cart";
        return (
          <Link
            key={to}
            to={to}
            className={`nav-link${active ? " nav-link-active" : ""}`}
            aria-current={active ? "page" : undefined}
            aria-label={
              isCart
                ? `Cart with ${cartItemCount} item${cartItemCount === 1 ? "" : "s"}`
                : undefined
            }
          >
            {label}
            {isCart && cartItemCount > 0 && (
              <span className="nav-cart-badge">
                {cartItemCount > 99 ? "99+" : cartItemCount}
              </span>
            )}
          </Link>
        );
      })}
      <button type="button" className="nav-logout" onClick={handleLogout}>
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
