import type { SyntheticEvent } from "react";

/** Shown when a menu item has no image or its image fails to load. */
export const FALLBACK_FOOD_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect fill='%23F5EFE0' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%23888080' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";

/** onError handler for <img> tags: swaps in the fallback image once. */
export function showFallbackImage(event: SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  if (img.src !== FALLBACK_FOOD_IMAGE) img.src = FALLBACK_FOOD_IMAGE;
}
