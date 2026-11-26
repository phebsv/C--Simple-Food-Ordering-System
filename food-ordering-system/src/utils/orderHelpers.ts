import type { FoodItem, InventoryStatus, Order, Review } from "../types";

export const LOW_STOCK_THRESHOLD = 10;

/** Status shown in the admin inventory, derived from stock and availability. */
export function inventoryStatus(item: Pick<FoodItem, "stock" | "available">): InventoryStatus {
  const stock = Number(item.stock ?? 0);
  if (stock <= 0) return "Out of Stock";
  if (item.available === false) return "Unavailable";
  if (stock < LOW_STOCK_THRESHOLD) return "Low Stock";
  return "Available";
}

/**
 * Short, readable order label: order number 1 → "#0-01", 25 → "#0-25", 107 → "#1-07".
 * Falls back to the first 8 characters of the long id if the server has no number yet.
 */
export function formatOrderNumber(order: Pick<Order, "id" | "orderNumber">): string {
  if (!order.orderNumber) return `#${order.id.slice(0, 8)}`;
  const digits = String(order.orderNumber).padStart(3, "0");
  return `#${digits.slice(0, -2)}-${digits.slice(-2)}`;
}

/** True when a search like "0-01", "#0-01" or "1" refers to this order's number. */
export function matchesOrderNumber(order: Pick<Order, "orderNumber">, query: string): boolean {
  const digits = query.replace(/[#\s-]/g, "");
  return !!order.orderNumber && /^\d+$/.test(digits) && Number(digits) === order.orderNumber;
}

/** Newest-first sort key for orders. */
export function getOrderTime(order: Pick<Order, "createdAt" | "updatedAt">): number {
  return new Date(order.createdAt || order.updatedAt || 0).getTime() || 0;
}

export function sortNewestFirst<T extends Pick<Order, "createdAt" | "updatedAt">>(orders: T[]): T[] {
  return [...orders].sort((a, b) => getOrderTime(b) - getOrderTime(a));
}

/** The review a customer left for one item of one order, if any. */
export function findItemReview(reviews: Review[], orderId: string, foodItemId: string) {
  return reviews.find(
    (r) => !r.hidden && r.orderId === orderId && String(r.foodItemId) === String(foodItemId),
  );
}

/** Average rating per menu item id, from visible reviews. */
export function averageRatings(reviews: Review[]): Record<string, { average: number; count: number }> {
  const totals: Record<string, { sum: number; count: number }> = {};
  for (const review of reviews) {
    if (review.hidden) continue;
    const entry = (totals[review.foodItemId] ??= { sum: 0, count: 0 });
    entry.sum += Number(review.rating) || 0;
    entry.count += 1;
  }
  return Object.fromEntries(
    Object.entries(totals).map(([id, { sum, count }]) => [id, { average: sum / count, count }]),
  );
}
