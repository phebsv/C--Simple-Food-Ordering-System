// The one HTTP client for the whole app. Every request to the backend goes
// through here so the auth header and error handling live in one place.
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { getStoredItem } from "../utils/storage";
import { TOKEN_KEY } from "../constants/storageKeys";
import type {
  AuthUser,
  CartItem,
  FoodItem,
  Order,
  OrderItem,
  OrderStatus,
  Review,
} from "../types";

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

API.interceptors.request.use((config) => {
  const token = getStoredItem(TOKEN_KEY);
  if (token && !config.headers.has("Authorization")) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Turn any thrown value into a readable message (prefers the server's message). */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  return err instanceof Error && err.message ? err.message : fallback;
}

// ---------- Auth ----------

type AuthPayload = { token: string; user: AuthUser };

export async function loginCustomer(email: string, password: string) {
  const res = await API.post<{ data: AuthPayload }>("/auth/login", { email, password });
  return { data: { token: res.data.data.token, customer: res.data.data.user } };
}

export async function logoutSession(token: string) {
  await API.post("/auth/logout", undefined, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function registerCustomer(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}) {
  const res = await API.post<{ data: AuthPayload }>("/auth/register", {
    ...data,
    phone: data.phone ?? "",
    address: data.address ?? "",
  });
  return { data: { token: res.data.data.token, customer: res.data.data.user } };
}

// ---------- Users ----------

export async function getUser(id: string) {
  return (await API.get<AuthUser>(`/users/${id}`)).data;
}

export async function changePassword(id: string, currentPassword: string, newPassword: string) {
  await API.post(`/users/${id}/password`, { currentPassword, newPassword });
}

export async function updateUser(id: string, data: Pick<AuthUser, "name" | "phone" | "address">) {
  return (await API.patch<AuthUser>(`/users/${id}`, data)).data;
}

// ---------- Menu ----------

export type MenuItemInput = Omit<FoodItem, "id" | "lastUpdated">;

export async function getMenuItems() {
  return (await API.get<FoodItem[]>("/menu")).data;
}

export async function addMenuItem(data: MenuItemInput) {
  return (await API.post<FoodItem>("/menu", data)).data;
}

export async function updateMenuItem(id: string, data: Partial<MenuItemInput>) {
  return (await API.patch<FoodItem>(`/menu/${id}`, data)).data;
}

export async function deleteMenuItem(id: string) {
  await API.delete(`/menu/${id}`);
}

// ---------- Orders ----------

export type NewOrder = Pick<
  Order,
  "customerName" | "customerEmail" | "customerPhone" | "customerAddress" | "paymentMethod" | "deliveryNotes"
> & { items: Pick<OrderItem, "id" | "quantity">[] };

/** Customers get their own orders; admins get every order. */
export async function getOrders() {
  return (await API.get<Order[]>("/orders")).data;
}

export async function placeOrder(order: NewOrder) {
  return (await API.post<Order>("/orders", order)).data;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  return (await API.patch<Order>(`/orders/${id}`, { status })).data;
}

// ---------- Reviews ----------

export async function getReviews() {
  return (await API.get<Review[]>("/reviews")).data;
}

export async function addReview(data: {
  orderId: string;
  foodItemId: string;
  rating: number;
  comment: string;
}) {
  return (await API.post<Review>("/reviews", data)).data;
}

export async function deleteReview(id: string) {
  await API.delete(`/reviews/${id}`);
}

// ---------- Cart ----------

type ServerCartItem = Omit<CartItem, "id" | "cartItemId"> & { id: string; menuId: string };

function toCartItem(item: ServerCartItem): CartItem {
  return {
    id: String(item.menuId),
    cartItemId: String(item.id),
    name: item.name,
    description: item.description || "",
    price: Number(item.price),
    category: item.category || "",
    image: item.image || "",
    quantity: Number(item.quantity) || 1,
  };
}

export async function getCart() {
  return (await API.get<ServerCartItem[]>("/cart_items")).data.map(toCartItem);
}

export async function addToCart(menuId: string) {
  return toCartItem((await API.post<ServerCartItem>("/cart_items", { menuId })).data);
}

export async function setCartQuantity(cartItemId: string, quantity: number) {
  return toCartItem((await API.patch<ServerCartItem>(`/cart_items/${cartItemId}`, { quantity })).data);
}

export async function removeFromCart(cartItemId: string) {
  await API.delete(`/cart_items/${cartItemId}`);
}

export async function clearCart() {
  await API.delete("/cart_items");
}
