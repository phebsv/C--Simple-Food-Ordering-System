// Shared data shapes. These match what the Express backend (src/services) returns.

export type FoodItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  available?: boolean;
  stock?: number;
  lastUpdated?: string;
};

export type CartItem = FoodItem & {
  quantity: number;
  /** Id of the cart line on the server (different from the menu item id). */
  cartItemId?: string;
};

export type OrderStatus = "Pending" | "Preparing" | "Ready" | "Delivered" | "Cancelled";

export const ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Preparing",
  "Ready",
  "Delivered",
  "Cancelled",
];

export type OrderItem = Pick<FoodItem, "id" | "name" | "description" | "price" | "category"> & {
  quantity: number;
};

export type Order = {
  id: string;
  /** Short sequential number from the server, shown as #0-01 (see formatOrderNumber). */
  orderNumber?: number;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  deliveryNotes?: string;
  createdAt: string;
  updatedAt: string;
};

export type InventoryStatus = "Available" | "Low Stock" | "Out of Stock" | "Unavailable";

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  stock: number;
  status: InventoryStatus;
  lastUpdated: string;
};

export type Review = {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  foodItemId: string;
  foodItemName: string;
  rating: number;
  comment: string;
  createdAt: string;
  hidden: boolean;
};

export type AuthUser = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  role?: "admin" | "user";
  isAdmin?: boolean;
};

export type AdminProfile = {
  name: string;
  role: string;
};
