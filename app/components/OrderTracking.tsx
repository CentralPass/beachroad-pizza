"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, api } from "../lib/api";
import { formatMoney, formatVenueDateTime } from "../lib/format";
import type { TrackedOrder } from "../lib/types";
import { orderReference } from "../lib/venue";
import { useCart } from "./CartProvider";
import { useVenue } from "./providers/VenueProvider";

const TERMINAL = new Set(["rejected", "cancelled", "completed", "handed_over"]);
const STAGES = ["Received", "Accepted", "Cooking", "Ready"];

const COPY: Record<string, { eyebrow: string; heading: string; body: string }> = {
  awaiting_payment: { eyebrow: "Finalising payment", heading: "Confirming your payment.", body: "This normally takes a moment. The page updates by itself." },
  pending: { eyebrow: "Order received", heading: "Waiting for the kitchen.", body: "Your order has reached the shop and is waiting for the team to accept it." },
  accepted: { eyebrow: "In the oven", heading: "We're making your order.", body: "Everything is underway. This page updates when it's ready to collect." },
  ready: { eyebrow: "Ready to collect", heading: "Your order is ready.", body: "Come on in and give the team your order number." },
  completed: { eyebrow: "Collected", heading: "Thanks for your order.", body: "Your order has been completed. Enjoy!" },
  handed_over: { eyebrow: "Collected", heading: "Thanks for your order.", body: "Your order has been handed over. Enjoy!" },
  rejected: { eyebrow: "Order update", heading: "We couldn't take this order.", body: "Sorry, we couldn't complete your order. Please call us if you need a hand." },
  cancelled: { eyebrow: "Order cancelled", heading: "This order was cancelled.", body: "Please call us if you have questions about the cancellation or a refund." },
};

function stage(status: string) {
  if (status === "awaiting_payment") return 0;
  if (status === "pending") return 1;
  if (status === "accepted") return 2;
  if (["ready", "completed", "handed_over"].includes(status)) return 4;
  return 0;
}

// /track/example previews the page (the admin SMS template editor links here).
function exampleOrder(): TrackedOrder {
  const pickup = new Date(Date.now() + 30 * 60 * 1000);
  pickup.setSeconds(0, 0);
  return {
    order_number: 1042,
    status: "accepted",
    pickup_time: pickup.toISOString(),
    payment: { method: "cash", amount_due_at_pickup: 32, adjustment_reason: null, message: "Please pay $32.00 when collecting your order." },
    items: [
      { id: 1, item_name: "Family Deal", quantity: 1, modifiers: [{ name: "Pepperoni" }] },
      { id: 2, item_name: "Cheesy Garlic Bread", quantity: 2, modifiers: [] },
    ],
  };
}

export function OrderTracking({ token }: { token: string }) {
  const venue = useVenue();
  const { clearCart, lines } = useCart();
  const isExample = token === "example";
  const [order, setOrder] = useState<TrackedOrder | null>(() => (isExample ? exampleOrder() : null));
  const [loading, setLoading] = useState(!isExample);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  // Arriving back from a redirect-based Stripe payment: the order exists, so
  // the cart is done with. Strip Stripe's query string, which carries the
  // payment client secret, out of the address bar and history.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("payment_intent")) return;
    if (params.get("redirect_status") === "succeeded" && lines.length) clearCart();
    window.history.replaceState(null, "", window.location.pathname);
  }, [clearCart, lines.length]);

  const load = useCallback(async (quiet = false) => {
    if (isExample) return;
    if (quiet) setRefreshing(true);
    try {
      const result = await api.get<TrackedOrder>(`/api/orders/track/${encodeURIComponent(token)}`);
      setOrder(result);
      setError(null);
      setCheckedAt(new Date());
    } catch (caught) {
      const failure = caught as ApiError;
      setError(failure.status === 404
        ? "This tracking link couldn't be found or has expired."
        : "We couldn't refresh your order just now. Please try again shortly.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isExample, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const active = Boolean(order && !TERMINAL.has(order.status)) && !isExample;
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void load(true), 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, load]);

  const copy = COPY[order?.status || "pending"] || COPY.pending;
  const progress = useMemo(() => stage(order?.status || ""), [order?.status]);
  const interrupted = order ? ["rejected", "cancelled"].includes(order.status) : false;
  const itemCount = order ? order.items.reduce((sum, item) => sum + Number(item.quantity), 0) : 0;

  return (
    <>
      <section className={`order-hero tracking-hero ${interrupted ? "is-interrupted" : ""}`}>
        <div className="shell" aria-live="polite">
          <p className="eyebrow">{order ? copy.eyebrow : "Order tracking"}</p>
          <h1>{loading ? "Finding your order." : !order ? "Tracking unavailable." : copy.heading}</h1>
          {order ? <p>{copy.body}</p> : null}
        </div>
      </section>

      <div className="shell tracking-page">
        {loading && !order ? <div className="empty-state" role="status"><h3>Loading your order…</h3></div> : null}

        {!loading && !order ? (
          <div className="empty-state" role="alert">
            <h3>We couldn&apos;t open this order.</h3>
            <p>{error}</p>
            <a className="button" href={venue.telHref}>Call {venue.phone}</a>
          </div>
        ) : null}

        {order ? (
          <>
            {isExample ? (
              <p className="order-notice" role="note"><strong>Example tracking page.</strong> No real order was placed; the details below are examples only.</p>
            ) : null}
            {error ? <p className="order-notice order-notice-alert" role="status">{error}</p> : null}

            <div className="tracking-header">
              <div><span>Order number</span><strong>{orderReference(order.order_number)}</strong></div>
              <div><span>Pickup</span><strong>{order.pickup_time ? formatVenueDateTime(order.pickup_time) : "As soon as it's ready"}</strong></div>
            </div>

            {!interrupted ? (
              <ol className="tracking-stages" aria-label={`Order status: ${copy.eyebrow}`}>
                {STAGES.map((label, index) => {
                  const state = index < progress ? "is-done" : index === progress ? "is-current" : "";
                  return (
                    <li key={label} className={state}>
                      <span aria-hidden="true">{index < progress ? "✓" : index + 1}</span>
                      {label}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="order-notice order-notice-alert" role="status">
                <strong>{copy.heading}</strong> {copy.body}
                {order.payment.method === "card" ? " Any refund can take a few business days to appear, depending on your bank." : ""}
              </div>
            )}

            <div className="tracking-grid">
              <section className="tracking-card">
                <p className="eyebrow">Payment</p>
                <h2>{order.payment.amount_due_at_pickup > 0 ? `${formatMoney(order.payment.amount_due_at_pickup)} due at pickup` : "Nothing due at pickup"}</h2>
                <p>{order.payment.message}</p>
                {order.payment.adjustment_reason ? <p className="tracking-adjustment">Reason: {order.payment.adjustment_reason}</p> : null}
                <span className="tracking-badge">{order.payment.method === "cash" ? "Pay in store" : "Paid by card"}</span>
              </section>
              <section className="tracking-card">
                <p className="eyebrow">Collect from</p>
                <h2>{venue.name}</h2>
                <p>{venue.address}</p>
                <a className="text-link" href={venue.mapsUrl} target="_blank" rel="noreferrer">Get directions</a>
              </section>
            </div>

            <section className="tracking-card tracking-items">
              <div className="tracking-items-head">
                <div>
                  <p className="eyebrow">Your order</p>
                  <h2>Items</h2>
                </div>
                <span>{itemCount} {itemCount === 1 ? "item" : "items"}</span>
              </div>
              <ul>
                {order.items.map((item) => (
                  <li key={item.id}>
                    <span className="tracking-qty">{item.quantity}</span>
                    <div>
                      <strong>{item.item_name}</strong>
                      {item.modifiers?.length ? <small>{item.modifiers.map((modifier) => modifier.name).join(", ")}</small> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <div className="tracking-refresh">
              <p>
                <span className={`live-dot ${active ? "is-live" : ""}`} aria-hidden="true" />
                {isExample ? "Sample status shown" : active ? "Updates automatically" : "Tracking complete"}
                {checkedAt ? <small> · checked {checkedAt.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}</small> : null}
              </p>
              {active ? (
                <button className="button button-secondary" type="button" onClick={() => void load(true)} disabled={refreshing}>
                  {refreshing ? "Checking…" : "Check now"}
                </button>
              ) : null}
            </div>
            <p className="checkout-note">Need help? <a href={venue.telHref}>Call {venue.phone}</a> or <Link href="/">head back home</Link>.</p>
          </>
        ) : null}
      </div>
    </>
  );
}
