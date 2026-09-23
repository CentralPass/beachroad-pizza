import { formatPrice, toNumber } from "./format";
import type { MenuCategory, MenuItem } from "./types";

/** The required single-choice group that carries the item's price ladder (e.g. size). */
export function sizeGroup(item: MenuItem) {
  return (item.modifier_groups || []).find(
    (group) => group.required && group.max_selections === 1 && group.options.some((option) => toNumber(option.price_delta) !== 0),
  ) || null;
}

/** "From $14.50" when a size changes the price, otherwise the price. */
export function priceLabel(item: MenuItem) {
  const base = toNumber(item.base_price);
  const group = sizeGroup(item);
  if (group) {
    const lowest = Math.min(...group.options.map((option) => base + toNumber(option.price_delta)));
    return `From ${formatPrice(lowest)}`;
  }
  return formatPrice(base);
}

/** "Small $14.50 | Large $18.50 | …" for the size details disclosure. */
export function sizeSummary(item: MenuItem) {
  const group = sizeGroup(item);
  if (!group) return null;
  const base = toNumber(item.base_price);
  return group.options.map((option) => `${option.name} ${formatPrice(base + toNumber(option.price_delta))}`).join(" | ");
}

export function isVegan(item: MenuItem) {
  return (item.dietary_tags || []).some((tag) => tag.toLowerCase() === "vegan");
}

export function findItem(categories: MenuCategory[], itemId: number) {
  for (const category of categories) {
    const item = category.items.find((entry) => entry.id === itemId);
    if (item) return { item, category };
  }
  return null;
}

/** The Deals category, however the owner names it in the admin portal. */
export function dealItems(categories: MenuCategory[] | null | undefined) {
  const category = (categories || []).find((entry) => /deal/i.test(entry.name));
  return category ? category.items : [];
}
