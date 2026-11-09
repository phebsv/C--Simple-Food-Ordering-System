import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AdminProvider } from "./context/AdminContext";
import { CartProvider } from "./context/CartContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/user/Dashboard";
import Menu from "./pages/user/Menu";
import Cart from "./pages/user/Cart";
import Checkout from "./pages/user/Checkout";
import MyOrders from "./pages/user/MyOrders";
import Profile from "./pages/user/Profile";
import OrderConfirmation from "./pages/user/OrderConfirmation";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMenu from "./pages/admin/AdminMenu";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminReviews from "./pages/admin/AdminReviews";

const customerRoutes: [string, ReactNode][] = [
  ["/dashboard", <Dashboard />],
  ["/menu", <Menu />],
  ["/cart", <Cart />],
  ["/checkout", <Checkout />],
  ["/order-confirmation", <OrderConfirmation />],
  ["/my-orders", <MyOrders />],
  ["/profile", <Profile />],
];

const adminRoutes: [string, ReactNode][] = [
  ["/admin/dashboard", <AdminDashboard />],
  ["/admin/menu", <AdminMenu />],
  ["/admin/orders", <AdminOrders />],
  ["/admin/inventory", <AdminInventory />],
  ["/admin/reviews", <AdminReviews />],
];

/** Sends each user to the area that matches their role. */
function RequireRole({ role, children }: { role: "customer" | "admin"; children: ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === "admin" && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (role === "customer" && isAdmin) return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
}

/** Logged-in users skip the login/register pages. */
function GuestOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (isAuthenticated) return <Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

      {customerRoutes.map(([path, page]) => (
        <Route key={path} path={path} element={<RequireRole role="customer">{page}</RequireRole>} />
      ))}
      {adminRoutes.map(([path, page]) => (
        <Route key={path} path={path} element={<RequireRole role="admin">{page}</RequireRole>} />
      ))}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </AdminProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
