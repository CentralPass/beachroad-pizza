import type { CartLine } from "../CartProvider";
import type { OfferApplied, SurchargeApplied } from "../../lib/types";

/**
 * An immutable snapshot of a successful order, taken before the live cart is
 * cleared. The receipt renders only from this, so clearing the cart can never
 * blank it, and a reload of /checkout shortly after can still show it.
 */
export type ReceiptSnapshot = {
  orderId: number;
  placedAt: string;
  pickupTime: string | null;
  paymentMethod: "cash" | "card";
  trackingUrl: string | null;
  name: string;
  email: string | null;
  lines: CartLine[];
  subtotal: number;
  offerApplied: OfferApplied | null;
  offerDiscount: number;
  discountCode: string | null;
  discountAmount: number;
  surcharge: SurchargeApplied | null;
  total: number;
  gst: number;
};

const KEY = "beach-road-pizza-last-receipt";
const KEEP_MS = 3 * 60 * 60 * 1000;

export function saveReceipt(receipt: ReceiptSnapshot) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(receipt));
  } catch {
    // The receipt is already on screen; storage only helps a reload.
  }
}

export function loadRecentReceipt(): ReceiptSnapshot | null {
  try {
    const stored = window.sessionStorage.getItem(KEY);
    if (!stored) return null;
    const receipt = JSON.parse(stored) as ReceiptSnapshot;
    return Date.now() - Date.parse(receipt.placedAt) < KEEP_MS ? receipt : null;
  } catch {
    return null;
  }
}

export function forgetReceipt() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to forget.
  }
}
