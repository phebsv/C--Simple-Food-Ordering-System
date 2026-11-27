// Admin data: menu, orders, inventory (derived from the menu) and reviews.
// Who is logged in comes from AuthContext; this context only holds admin data.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as api from "../services/api";
import { getErrorMessage, type MenuItemInput } from "../services/api";
import { useAuth } from "./AuthContext";
import type { AuthUser, FoodItem, InventoryItem, Order, OrderStatus, Review } from "../types";
import { inventoryStatus } from "../utils/orderHelpers";

const REFRESH_INTERVAL_MS = 5000;

type FetchOptions = { showLoading?: boolean };

interface AdminContextType {
  admin: AuthUser | null;
  isAuthenticated: boolean;
  logout: () => void;

  menuItems: FoodItem[];
  fetchMenuItems: (options?: FetchOptions) => Promise<void>;
  addMenuItem: (data: MenuItemInput) => Promise<void>;
  updateMenuItem: (id: string, data: Partial<MenuItemInput>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  toggleItemAvailability: (id: string) => Promise<void>;

  orders: Order[];
  fetchOrders: (options?: FetchOptions) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<Order>;
  cancelOrder: (id: string) => Promise<void>;

  inventoryItems: InventoryItem[];
  fetchInventory: (options?: FetchOptions) => Promise<void>;
  updateStock: (id: string, quantity: number) => Promise<void>;
  setItemAvailable: (id: string, available: boolean) => Promise<void>;

  reviews: Review[];
  fetchReviews: (options?: FetchOptions) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;

  loading: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { customer, isAdmin, logout } = useAuth();
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared wrapper for every "load X from the server" call.
  const load = useCallback(
    async <T,>(
      request: () => Promise<T>,
      onData: (data: T) => void,
      failMessage: string,
      { showLoading = true }: FetchOptions = {},
    ) => {
      if (showLoading) setLoading(true);
      try {
        onData(await request());
      } catch (err) {
        setError(getErrorMessage(err, failMessage));
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [],
  );

  const fetchMenuItems = useCallback(
    (options?: FetchOptions) =>
      load(api.getMenuItems, setMenuItems, "Failed to fetch menu items.", options),
    [load],
  );
  const fetchOrders = useCallback(
    (options?: FetchOptions) => load(api.getOrders, setOrders, "Failed to fetch orders.", options),
    [load],
  );
  const fetchReviews = useCallback(
    (options?: FetchOptions) =>
      load(api.getReviews, setReviews, "Failed to fetch reviews.", options),
    [load],
  );

  const replaceMenuItem = (updated: FoodItem) =>
    setMenuItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));

  // ----- Menu -----
  const addMenuItem = useCallback(
    async (data: MenuItemInput) => {
      const created = await api.addMenuItem(data);
      setMenuItems((prev) => [...prev, created]);
    },
    [],
  );

  const updateMenuItem = useCallback(async (id: string, data: Partial<MenuItemInput>) => {
    replaceMenuItem(await api.updateMenuItem(id, data));
  }, []);

  const deleteMenuItem = useCallback(async (id: string) => {
    await api.deleteMenuItem(id);
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const setItemAvailable = useCallback(
    async (id: string, available: boolean) => {
      const item = menuItems.find((i) => i.id === id);
      if (available && Number(item?.stock ?? 0) <= 0) {
        throw new Error("Out-of-stock items cannot be set to Available.");
      }
      replaceMenuItem(await api.updateMenuItem(id, { available }));
    },
    [menuItems],
  );

  const toggleItemAvailability = useCallback(
    async (id: string) => {
      const item = menuItems.find((i) => i.id === id);
      if (item) await setItemAvailable(id, item.available === false);
    },
    [menuItems, setItemAvailable],
  );

  // ----- Inventory (stock lives on the menu item) -----
  const inventoryItems = useMemo<InventoryItem[]>(
    () =>
      menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        stock: Number(item.stock ?? 0),
        status: inventoryStatus(item),
        lastUpdated: item.lastUpdated || "",
      })),
    [menuItems],
  );

  const updateStock = useCallback(async (id: string, quantity: number) => {
    replaceMenuItem(await api.updateMenuItem(id, { stock: quantity, available: quantity > 0 }));
  }, []);

  // ----- Orders -----
  const updateOrderStatus = useCallback(async (id: string, status: OrderStatus) => {
    const updated = await api.updateOrderStatus(id, status);
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    return updated;
  }, []);

  const cancelOrder = useCallback(
    async (id: string) => {
      await updateOrderStatus(id, "Cancelled");
      // Cancelling puts stock back on the menu.
      await fetchMenuItems({ showLoading: false });
    },
    [updateOrderStatus, fetchMenuItems],
  );

  // ----- Reviews -----
  const deleteReview = useCallback(async (id: string) => {
    await api.deleteReview(id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Keep admin data fresh while an admin is logged in.
  useEffect(() => {
    if (!isAdmin) return;
    const refreshAll = () => {
      fetchMenuItems({ showLoading: false });
      fetchOrders({ showLoading: false });
      fetchReviews({ showLoading: false });
    };
    const first = window.setTimeout(refreshAll, 0);
    const interval = window.setInterval(refreshAll, REFRESH_INTERVAL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [isAdmin, fetchMenuItems, fetchOrders, fetchReviews]);

  const value: AdminContextType = {
    admin: isAdmin ? customer : null,
    isAuthenticated: isAdmin,
    logout,
    menuItems,
    fetchMenuItems,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleItemAvailability,
    orders,
    fetchOrders,
    updateOrderStatus,
    cancelOrder,
    inventoryItems,
    fetchInventory: fetchMenuItems,
    updateStock,
    setItemAvailable,
    reviews,
    fetchReviews,
    deleteReview,
    loading,
    error,
    setError,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
