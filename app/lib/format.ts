import { VENUE_TIMEZONE } from "./venue";

export function toNumber(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** $14.50, and $25 for whole dollars. */
export function formatPrice(value: string | number | null | undefined) {
  const amount = toNumber(value);
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Always two decimals, for totals and receipts. */
export function formatMoney(value: string | number | null | undefined) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(toNumber(value));
}

export function formatDelta(value: string | number | null | undefined) {
  const amount = toNumber(value);
  if (!amount) return "";
  return `${amount > 0 ? "+" : "−"}${formatPrice(Math.abs(amount))}`;
}

/** "15:00" or "15:00:00" to "3:00 pm". */
export function formatClock(time: string | null | undefined) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${suffix}`;
}

export function formatVenueTime(iso: string | Date) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: VENUE_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatVenueDateTime(iso: string | Date, withYear = false) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: VENUE_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

const DIETARY_LABELS: Record<string, string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  "gluten-free": "Gluten free",
  "dairy-free": "Dairy free",
  "nut-free": "Nut free",
  halal: "Halal",
  "contains-nuts": "Contains nuts",
  "contains-dairy": "Contains dairy",
  "contains-gluten": "Contains gluten",
};

export function dietaryLabel(tag: string) {
  const key = tag.toLowerCase().replace(/[ _]/g, "-");
  return DIETARY_LABELS[key] || tag;
}
