/**
 * Everything about Beach Road Pizza that the storefront needs, in one place.
 *
 * LIVE    name, phone, email, address, ABN, website and payment methods are
 *         owned by the admin portal and served from GET /api/settings/public,
 *         so the owner can change them without a deploy. Read them through
 *         useVenue(), never from here directly.
 *
 * STATIC  things the backend has no field for: map link, socials, delivery
 *         partners, order reference prefix. Deploy-time config, edited here.
 *
 * FALLBACK only covers the first paint and a settings outage, so the page
 * shows this venue's last known details rather than blanks.
 */

export type PaymentMethods = { cash: boolean; card: boolean };

export type VenueDetails = {
  name: string;
  shortName: string;
  phone: string;
  email: string | null;
  address: string;
  abn: string | null;
  website: string;
  paymentMethods: PaymentMethods;
};

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://beachroadpizza.com.au").replace(/\/+$/, "");

// Trading timezone. Pickup slots and "today" are always the shop's day, not
// the customer's device day.
export const VENUE_TIMEZONE = "Australia/Adelaide";

export const FALLBACK: VenueDetails = {
  name: "Beach Road Pizza",
  shortName: "BRP",
  phone: "08 8186 5991",
  email: null,
  address: "29B Beach Road, Christies Beach SA 5165",
  abn: null,
  website: SITE_URL,
  paymentMethods: { cash: true, card: true },
};

export const STATIC = {
  suburb: "Christies Beach",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=29B+Beach+Road+Christies+Beach+SA+5165",
  // Only list what the venue actually uses; an icon linking nowhere is worse
  // than no icon.
  social: {
    instagram: "https://www.instagram.com/beachroadpizza",
    facebook: "https://facebook.com/BeachRoadPizza",
  },
  // Delivery runs through these partners. CentralPass online ordering is
  // pickup only until platform delivery ships.
  delivery: {
    uberEats: "https://www.ubereats.com/au/store/beach-road-pizza/030AM-V6QQKLRdzYjvj5RQ",
    doorDash: "https://www.doordash.com/en-AU/store/beach-road-pizza-christies-beach-35409369/",
  },
  // Prefix on customer-facing order references. Never another venue's.
  orderPrefix: "BRP",
};

// A time-bound notice shown above every page, e.g. a holiday closure. Set to
// null when there is nothing to say; it removes itself after `until`.
export const SITE_NOTICE: { message: string; from?: string; until: string; href?: string; action?: string } | null = null;

// Browser storage keys, namespaced so they can never collide with another
// CentralPass venue opened in the same browser.
export const STORAGE_KEYS = {
  cart: "beach-road-pizza-cart-v2",
  legacyCart: "beach-road-pizza-cart-v1",
  promoDismissed: "beach-road-pizza-promo-dismissed",
  tableToken: "beach-road-pizza-table-token",
  tableCart: "beach-road-pizza-table-cart",
};

/** `tel:` needs digits only. */
export function telHref(phone: string | null | undefined) {
  return `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;
}

export function orderReference(orderNumber: number | string | null | undefined) {
  if (orderNumber == null || orderNumber === "") return null;
  return `${STATIC.orderPrefix}-${String(orderNumber).padStart(6, "0")}`;
}

type PublicSettings = {
  restaurant_name?: string | null;
  brand_short?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  abn?: string | null;
  website?: string | null;
  payment_methods?: Partial<PaymentMethods> | null;
};

/** Map the public-settings payload onto our shape, ignoring empty strings. */
export function fromPublicSettings(data: PublicSettings | null | undefined): VenueDetails {
  if (!data) return { ...FALLBACK };
  const pick = (value: string | null | undefined, fallback: string) => {
    const trimmed = typeof value === "string" ? value.trim() : value;
    return trimmed || fallback;
  };
  const optional = (value: string | null | undefined) => (typeof value === "string" && value.trim()) || null;
  return {
    name: pick(data.restaurant_name, FALLBACK.name),
    shortName: pick(data.brand_short, FALLBACK.shortName),
    phone: pick(data.phone, FALLBACK.phone),
    email: optional(data.email),
    address: pick(data.address, FALLBACK.address),
    abn: optional(data.abn),
    website: pick(data.website, FALLBACK.website),
    paymentMethods: {
      cash: data.payment_methods?.cash !== false,
      card: data.payment_methods?.card !== false,
    },
  };
}
