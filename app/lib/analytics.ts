"use client";

/**
 * Optional Google Ads measurement. Nothing loads unless NEXT_PUBLIC_GOOGLE_ADS_ID
 * is set, and the privacy page only mentions advertising when it is. Turning
 * it on changes the site's privacy posture, so update the policy first.
 */

export const ADS_ID = (process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "").trim();
const CONVERSION_LABEL = (process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL || "").trim();

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
  }
}

// Paths carrying a private bearer token. They are reported as the route shape,
// never the real path, so a token can't reach Google.
const REDACTED_PREFIXES: Array<[string, string]> = [
  ["/track/", "/track/:token"],
  ["/bookings/manage/", "/bookings/manage/:token"],
  ["/table", "/table"],
];

export function redactPath(pathname: string) {
  const hit = REDACTED_PREFIXES.find(([prefix]) => pathname.startsWith(prefix));
  return hit ? hit[1] : pathname;
}

function gtagReady() {
  return Boolean(ADS_ID) && typeof window !== "undefined" && typeof window.gtag === "function";
}

const firedThisSession = new Set<string>();

// Exactly once per order: survives re-renders, StrictMode and a reload of the
// confirmation screen.
function claimOrder(orderId: number | string) {
  const key = `beach-road-ads-conversion-${orderId}`;
  if (firedThisSession.has(key)) return false;
  try {
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // The Set still prevents a double fire in this page session.
  }
  firedThisSession.add(key);
  return true;
}

/** Report a completed order, for both cash and card paths. */
export function trackPurchase(orderId: number | string | null | undefined, value?: number) {
  if (orderId == null || !gtagReady() || !CONVERSION_LABEL) return false;
  if (!claimOrder(orderId)) return false;
  const numeric = Number(value);
  window.gtag!("event", "conversion", {
    send_to: `${ADS_ID}/${CONVERSION_LABEL}`,
    transaction_id: String(orderId),
    ...(Number.isFinite(numeric) && numeric > 0 ? { value: Number(numeric.toFixed(2)), currency: "AUD" } : {}),
  });
  return true;
}

export function trackPageView(pathname: string) {
  if (!gtagReady()) return false;
  const path = redactPath(pathname);
  window.gtag!("event", "page_view", {
    send_to: ADS_ID,
    page_path: path,
    page_location: `${window.location.origin}${path}`,
    page_title: document.title,
  });
  return true;
}
