"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, api } from "../lib/api";
import { formatMoney, formatVenueDateTime, formatVenueTime } from "../lib/format";
import type { TrackedOrder } from "../lib/types";
import { orderReference } from "../lib/venue";
import { useCart } from "./CartProvider";
import { useVenue } from "./providers/VenueProvider";

const TERMINAL = new Set(["rejected", "cancelled", "completed", "handed_over"]);
const STAGES = ["Received", "Accepted", "Cooking", "Ready"];
const DELIVERY_STAGES = ["Received", "Being made", "On the way", "Delivered"];
const DELIVERY_DONE = new Set(["delivered", "failed", "cancelled"]);

type Copy = { eyebrow: string; heading: string; body: string };

const COPY: Record<string, Copy> = {
  awaiting_payment: { eyebrow: "Finalising payment", heading: "Confirming your payment.", body: "This normally takes a moment. The page updates by itself." },
  pending: { eyebrow: "Order received", heading: "Waiting for the kitchen.", body: "Your order has reached the shop and is waiting for the team to accept it." },
  accepted: { eyebrow: "In the oven", heading: "We're making your order.", body: "Everything is underway. This page updates when it's ready to collect." },
  ready: { eyebrow: "Ready to collect", heading: "Your order is ready.", body: "Come on in and give the team your order number." },
  completed: { eyebrow: "Collected", heading: "Thanks for your order.", body: "Your order has been completed. Enjoy!" },
  handed_over: { eyebrow: "Collected", heading: "Thanks for your order.", body: "Your order has been handed over. Enjoy!" },
  rejected: { eyebrow: "Order update", heading: "We couldn't take this order.", body: "Sorry, we couldn't complete your order. Please call us if you need a hand." },
  cancelled: { eyebrow: "Order cancelled", heading: "This order was cancelled.", body: "Please call us if you have questions about the cancellation or a refund." },
};

// Where a delivery is up to, in the customer's words.
function deliveryCopy(order: TrackedOrder): Copy {
  const d = order.delivery;
  if (["rejected", "cancelled", "awaiting_payment", "pending"].includes(order.status) || !d) return COPY[order.status] || COPY.pending;
  const due = d.promised_at ? formatVenueTime(d.promised_at) : null;
  const driver = d.driver_first_name || "Your driver";
  if (d.status === "delivered") {
    return { eyebrow: "Delivered", heading: "Delivered. Enjoy!", body: `${driver} dropped it off${d.delivered_at ? ` at ${formatVenueTime(d.delivered_at)}` : ""}. Thanks for ordering.` };
  }
  if (d.status === "failed") {
    return { eyebrow: "Delivery update", heading: "We couldn't deliver your order.", body: "Sorry about that. Please call us and we'll sort it out." };
  }
  if (d.status === "cancelled") return COPY.cancelled;
  if (d.status === "on_the_way") {
    return { eyebrow: "On the way", heading: `${driver} is on the way.`, body: `It left${d.left_at ? ` at ${formatVenueTime(d.left_at)}` : ""}${due ? ` and should arrive around ${due}` : ""}.` };
  }
  if (["ready", "completed"].includes(order.status)) {
    return { eyebrow: "Ready", heading: "Ready and waiting for the driver.", body: due ? `It should reach you around ${due}.` : "It's about to head your way." };
  }
  return { eyebrow: "In the oven", heading: "We're making your order.", body: due ? `It should reach you around ${due}. This page updates when it leaves.` : "This page updates when it leaves." };
}

function stage(status: string) {
  if (status === "awaiting_payment") return 0;
  if (status === "pending") return 1;
  if (status === "accepted") return 2;
  if (["ready", "completed", "handed_over"].includes(status)) return 4;
  return 0;
}

function deliveryStage(order: TrackedOrder) {
  const d = order.delivery;
  if (d?.status === "delivered") return 4;
  if (d?.status === "on_the_way") return 2;
  if (["accepted", "ready", "completed"].includes(order.status)) return 1;
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

  const isDelivery = order?.order_type === "delivery";
  // A delivery isn't finished when it leaves the kitchen, only at the door.
  const finished = order
    ? isDelivery
      ? ["rejected", "cancelled"].includes(order.status) || DELIVERY_DONE.has(order.delivery?.status || "")
      : TERMINAL.has(order.status)
    : false;
  const active = Boolean(order && !finished) && !isExample;
  // On the road the driver's position moves, so check more often.
  const onTheWay = isDelivery && order?.delivery?.status === "on_the_way";
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void load(true), onTheWay ? 10_000 : 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, onTheWay, load]);

  const copy = order ? (isDelivery ? deliveryCopy(order) : COPY[order.status] || COPY.pending) : COPY.pending;
  const stages = isDelivery ? DELIVERY_STAGES : STAGES;
  const progress = useMemo(() => (order ? (isDelivery ? deliveryStage(order) : stage(order.status)) : 0), [order, isDelivery]);
  const interrupted = order
    ? ["rejected", "cancelled"].includes(order.status) || (isDelivery && ["failed", "cancelled"].includes(order.delivery?.status || ""))
    : false;
  const itemCount = order ? order.items.reduce((sum, item) => sum + Number(item.quantity), 0) : 0;
  const due = order?.payment.amount_due_at_pickup || 0;
  const delivery = order?.delivery;

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
              {isDelivery && delivery ? (
                <div><span>Delivery</span><strong>{delivery.promised_at ? `${delivery.scheduled ? "" : "Around "}${formatVenueTime(delivery.promised_at)}` : "As soon as possible"}</strong></div>
              ) : (
                <div><span>Pickup</span><strong>{order.pickup_time ? formatVenueDateTime(order.pickup_time) : "As soon as it's ready"}</strong></div>
              )}
            </div>

            {!interrupted ? (
              <ol className="tracking-stages" aria-label={`Order status: ${copy.eyebrow}`}>
                {stages.map((label, index) => {
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
                <h2>
                  {due > 0
                    ? `${formatMoney(due)} due ${isDelivery ? "on delivery" : "at pickup"}`
                    : isDelivery ? "Nothing due on delivery" : "Nothing due at pickup"}
                </h2>
                <p>{order.payment.message}</p>
                {order.payment.adjustment_reason ? <p className="tracking-adjustment">Reason: {order.payment.adjustment_reason}</p> : null}
                <span className="tracking-badge">
                  {order.payment.method === "cash" ? (isDelivery ? "Pay the driver" : "Pay in store") : "Paid by card"}
                </span>
              </section>
              {isDelivery && delivery ? (
                <section className="tracking-card">
                  <p className="eyebrow">Delivering to</p>
                  <h2>{delivery.address}</h2>
                  <p>{delivery.suburb}{delivery.leave_at_door ? " · leave at the door" : ""}</p>
                  {delivery.driver_location ? (
                    <p className="tracking-driver">
                      <span className="live-dot is-live" aria-hidden="true" />
                      {delivery.driver_first_name || "Your driver"} was here at {formatVenueTime(delivery.driver_location.at)}.{" "}
                      <a className="text-link" target="_blank" rel="noreferrer"
                        href={`https://www.google.com/maps/search/?api=1&query=${delivery.driver_location.lat},${delivery.driver_location.lng}`}>
                        See on a map
                      </a>
                    </p>
                  ) : null}
                  {order.tip_amount ? <p>Thanks for the {formatMoney(order.tip_amount)} tip. It all goes to the driver.</p> : null}
                </section>
              ) : (
                <section className="tracking-card">
                  <p className="eyebrow">Collect from</p>
                  <h2>{venue.name}</h2>
                  <p>{venue.address}</p>
                  <a className="text-link" href={venue.mapsUrl} target="_blank" rel="noreferrer">Get directions</a>
                </section>
              )}
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
