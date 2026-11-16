import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartItem, FoodItem } from "../types";
import { useAuth } from "./AuthContext";
import * as api from "../services/api";

type CartContextType = {
  items: CartItem[];
  total: number;
  itemCount: number;
  loading: boolean;
  addItem: (item: FoodItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  reloadCart: () => Promise<void>;
};

const CartContext = createContext<CartContextType | null>(null);

// The cart is updated in the UI straight away (optimistic) and then saved to the
// server. If saving fails we reload the server copy so the two never drift apart.
export function CartProvider({ children }: { children: ReactNode }) {
  const { customer, isAuthenticated, isAdmin } = useAuth();
  const customerId = isAuthenticated && !isAdmin ? customer?.id : undefined;
  const [cart, setCart] = useState<{ ownerId?: string; items: CartItem[] }>({ items: [] });
  const [loading, setLoading] = useState(false);

  // Items from a previous user are never shown to the next one.
  const items = useMemo(
    () => (cart.ownerId === customerId ? cart.items : []),
    [cart, customerId],
  );
  const setItems = useCallback(
    (update: (prev: CartItem[]) => CartItem[]) =>
      setCart((prev) => ({
        ownerId: customerId,
        items: update(prev.ownerId === customerId ? prev.items : []),
      })),
    [customerId],
  );

  const reload = useCallback(async () => {
    if (!customerId) return;
    try {
      const loaded = await api.getCart();
      setCart({ ownerId: customerId, items: loaded });
    } catch {
      // Keep what we have; the next action will retry.
    }
  }, [customerId]);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    // Loading flag is set inside the async callback, not synchronously in the effect.
    Promise.resolve()
      .then(() => {
        if (!cancelled) setLoading(true);
        return api.getCart();
      })
      .then((loaded) => {
        if (!cancelled) setCart({ ownerId: customerId, items: loaded });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const findLine = useCallback(
    (id: string) => items.find((item) => item.id === id),
    [items],
  );

  const addItem = useCallback(
    (item: FoodItem) => {
      setItems((prev) =>
        prev.some((line) => line.id === item.id)
          ? prev.map((line) => (line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line))
          : [...prev, { ...item, quantity: 1 }],
      );
      api
        .addToCart(item.id)
        .then((saved) => setItems((prev) => prev.map((line) => (line.id === saved.id ? saved : line))))
        .catch(reload);
    },
    [setItems, reload],
  );

  const removeItem = useCallback(
    (id: string) => {
      const line = findLine(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (line?.cartItemId) api.removeFromCart(line.cartItemId).catch(reload);
    },
    [findLine, setItems, reload],
  );

  const updateQuantity = useCallback(
    (id: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(id);
        return;
      }
      const line = findLine(id);
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity } : item)));
      if (line?.cartItemId) api.setCartQuantity(line.cartItemId, quantity).catch(reload);
    },
    [findLine, removeItem, setItems, reload],
  );

  const value = useMemo(
    () => ({
      items,
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      loading,
      addItem,
      removeItem,
      updateQuantity,
      reloadCart: reload,
    }),
    [items, loading, addItem, removeItem, updateQuantity, reload],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
