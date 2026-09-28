"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ApiError, api } from "../../lib/api";
import { loadSavedAddress, saveAddress, useDeliveryConfig, zoneFor } from "../../lib/delivery";
import { formatMoney, formatVenueTime } from "../../lib/format";
import { pickupSlots } from "../../lib/hours";
import type { CreateOrderResponse, DeliveryConfig, Quote } from "../../lib/types";
import { LinePrice, ModifierList, QuoteRows, useCart } from "../CartProvider";
import { useStoreStatus } from "../providers/StoreStatusProvider";
import { useVenue } from "../providers/VenueProvider";
import { OrderReceipt } from "./OrderReceipt";
import { loadRecentReceipt, saveReceipt, type ReceiptSnapshot } from "./receipt";

const STRIPE_KEY = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "").trim();
let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!STRIPE_KEY) return null;
  stripePromise ??= loadStripe(STRIPE_KEY);
  return stripePromise;
}

// Domestic 0 + 9 digits (mobile or landline) or +61 + 9 digits, after cleanup.
const AU_PHONE = /^(0\d{9}|\+61\d{9})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanPhone = (value: string) => value.replace(/[\s\-().]/g, "");

type Details = {
  name: string;
  phone: string;
  email: string;
  timing: "asap" | "scheduled";
  pickupTime: string;
  deliveryTime: string;
  notes: string;
  paymentMethod: "card" | "cash";
  marketingOptIn: boolean;
  addressLine1: string;
  addressLine2: string;
  instructions: string;
  leaveAtDoor: boolean;
};

const BLANK: Details = {
  name: "",
  phone: "",
  email: "",
  timing: "asap",
  pickupTime: "",
  deliveryTime: "",
  notes: "",
  paymentMethod: "card",
  marketingOptIn: false,
  addressLine1: "",
  addressLine2: "",
  instructions: "",
  leaveAtDoor: false,
};

type Delivered = { suburb: string; postcode: string } | null;
type PendingCard = { order: CreateOrderResponse; details: Details; quote: Quote | null; delivery: Delivered };

// Backend refusals that deserve a specific next step rather than "failed".
// Delivery refusals already come with a sentence written for the customer.
const RECOVERY: Record<string, string> = {
  STORE_CLOSED: "We've just closed for online orders. Please check our hours and order when we're open.",
  ORDERS_PAUSED: "The kitchen has paused online orders for a moment. Please try again shortly.",
  OUTSIDE_SERVICE_WINDOW: "Something in your cart isn't being served right now. Remove it to continue.",
  PICKUP_TOO_SOON: "That pickup time is now too soon for the kitchen. Please choose a later time.",
  PICKUP_OUTSIDE_HOURS: "That pickup time is outside today's hours. Please choose another.",
  PICKUP_NOT_TODAY: "Pickup times are for today only. Please choose another time.",
  PAYMENT_METHOD_UNAVAILABLE: "That payment method was just switched off. Please choose another.",
};
// Refusals that mean the delivery times or state on screen are out of date.
const STALE_DELIVERY = ["DELIVERY_TIME_UNAVAILABLE", "DELIVERY_BUSY", "DELIVERY_CLOSED", "DELIVERY_PAUSED", "DELIVERY_NOT_STARTED", "NOT_OFFERED"];

const addressText = (details: Details, place: Delivered) =>
  [[details.addressLine2.trim(), details.addressLine1.trim()].filter(Boolean).join(", "), place ? `${place.suburb} ${place.postcode}` : ""]
    .filter(Boolean).join(", ");

function buildReceipt(order: CreateOrderResponse, details: Details, delivery: Delivered, snapshot: { lines: ReturnType<typeof useCart>["lines"]; quote: Quote | null; subtotal: number; discountCode: string | null }): ReceiptSnapshot {
  const { quote } = snapshot;
  const total = quote ? quote.total : snapshot.subtotal;
  return {
    orderId: order.orderId,
    placedAt: new Date().toISOString(),
    pickupTime: !delivery && details.timing === "scheduled" ? details.pickupTime : null,
    paymentMethod: details.paymentMethod,
    trackingUrl: order.tracking_url,
    name: details.name.trim(),
    email: details.email.trim() || null,
    lines: [...snapshot.lines],
    subtotal: quote ? quote.subtotal : snapshot.subtotal,
    offerApplied: order.offer_applied || quote?.offer_applied || null,
    offerDiscount: quote?.offer_discount || 0,
    discountCode: snapshot.discountCode,
    discountAmount: quote?.discount_amount || 0,
    surcharge: order.surcharge_applied || quote?.surcharge_applied || null,
    total,
    // Prefer the server's per-item GST; the /11 fallback assumes every item is taxed at 10%.
    gst: order.tax_summary?.gst_total ?? quote?.tax_breakdown?.gst_total ?? total / 11,
    delivery: delivery && order.delivery ? {
      address: addressText(details, delivery),
      promisedAt: order.delivery.promised_at,
      scheduled: order.delivery.scheduled,
      fee: order.delivery.fee,
      tip: order.delivery.tip,
    } : null,
  };
}

export function CheckoutFlow() {
  const cart = useCart();
  const [step, setStep] = useState<"details" | "payment" | "done">("details");
  const [receipt, setReceipt] = useState<ReceiptSnapshot | null>(null);
  const [pending, setPending] = useState<PendingCard | null>(null);
  const [savedDetails, setSavedDetails] = useState<Details | null>(null);
  // undefined until checked. A reload straight after ordering shows that
  // receipt again instead of an empty cart, but only when there is no new
  // cart: a fresh order must never be shown someone's previous receipt.
  const [recent, setRecent] = useState<ReceiptSnapshot | null | undefined>(undefined);
  const hasLines = cart.lines.length > 0;

  useEffect(() => {
    if (!cart.hydrated || recent !== undefined) return;
    const timer = window.setTimeout(() => setRecent(hasLines ? null : loadRecentReceipt()), 0);
    return () => window.clearTimeout(timer);
  }, [cart.hydrated, hasLines, recent]);

  function finish(snapshot: ReceiptSnapshot) {
    saveReceipt(snapshot);
    setReceipt(snapshot);
    setStep("done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const shownReceipt = step === "done" && receipt ? receipt : !hasLines && recent ? recent : null;
  if (shownReceipt) {
    return (
      <>
        <CheckoutSteps step="done" />
        <OrderReceipt receipt={shownReceipt} />
      </>
    );
  }

  if (!hasLines) {
    if (!cart.hydrated || recent === undefined) return <div className="checkout-empty" role="status"><p>Loading your order…</p></div>;
    return (
      <div className="checkout-empty">
        <h2>Your cart is empty.</h2>
        <p>Pick a few favourites first, then come back to check out.</p>
        <a className="button" href="/order">Start your order</a>
      </div>
    );
  }

  return (
    <>
      <CheckoutSteps step={step} />
      <div className="checkout-layout">
        <div>
          {step === "details" ? (
            <DetailsStep
              initial={savedDetails}
              onCash={(order, details, delivery) => {
                finish(buildReceipt(order, details, delivery, cart));
              }}
              onCard={(order, details, delivery) => {
                setSavedDetails(details);
                setPending({ order, details, quote: cart.quote, delivery });
                setStep("payment");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ) : pending ? (
            <PaymentStep
              pending={pending}
              onBack={() => {
                setPending(null);
                setStep("details");
              }}
              onPaid={() => finish(buildReceipt(pending.order, pending.details, pending.delivery, cart))}
            />
          ) : null}
        </div>
        <OrderSummary />
      </div>
    </>
  );
}

function CheckoutSteps({ step }: { step: "details" | "payment" | "done" }) {
  const steps = [
    { key: "details", label: "Your details" },
    { key: "payment", label: "Payment" },
    { key: "done", label: "Confirmation" },
  ];
  const current = steps.findIndex((entry) => entry.key === step);
  return (
    <ol className="checkout-steps" aria-label="Checkout progress">
      {steps.map((entry, index) => (
        <li key={entry.key} className={index === current ? "is-current" : index < current ? "is-done" : ""} aria-current={index === current ? "step" : undefined}>
          <span aria-hidden="true">{index < current ? "✓" : index + 1}</span>
          {entry.label}
        </li>
      ))}
    </ol>
  );
}

function OrderSummary() {
  const { lines, subtotal, total, quote, quoteStatus, discountCode } = useCart();
  return (
    <aside className="order-total-card checkout-summary" aria-label="Order summary">
      <p className="eyebrow">Order summary</p>
      <div className="summary-lines">
        {lines.map((line, index) => (
          <div className="summary-line" key={line.id}>
            <div>
              <strong>{line.qty} × {line.item.name}</strong>
              <ModifierList modifiers={line.modifiers} />
            </div>
            <LinePrice line={line} index={index} quote={quote} />
          </div>
        ))}
      </div>
      <QuoteRows quote={quote} subtotal={subtotal} discountCode={discountCode} />
      <div className="order-grand-total"><span>Total</span><strong>{formatMoney(total)}</strong></div>
      <p>
        {quoteStatus === "loading" ? "Updating your total…" : `Includes GST of ${formatMoney(quote?.tax_breakdown?.gst_total ?? total / 11)}.`}
      </p>
      <a className="text-link" href="/order">Edit order</a>
    </aside>
  );
}

// "From $5 · free over $60", for the delivery card before a suburb is chosen.
function deliverySummary(config: Extract<DeliveryConfig, { offered: true }>) {
  const fees = config.zones.map((zone) => zone.fee);
  if (!fees.length) return "To selected suburbs";
  const lowest = Math.min(...fees);
  const from = lowest === 0 ? "Free to nearby suburbs" : fees.every((fee) => fee === lowest) ? `${formatMoney(lowest)} delivery` : `From ${formatMoney(lowest)}`;
  return config.free_over ? `${from} · free over ${formatMoney(config.free_over)}` : from;
}

const TIPS = [0, 2, 4, 6];

function DetailsStep({ initial, onCash, onCard }: {
  initial: Details | null;
  onCash: (order: CreateOrderResponse, details: Details, delivery: Delivered) => void;
  onCard: (order: CreateOrderResponse, details: Details, delivery: Delivered) => void;
}) {
  const venue = useVenue();
  const cart = useCart();
  const status = useStoreStatus();
  const { config, refresh: refreshDelivery } = useDeliveryConfig();
  const offered = config?.offered ? config : null;
  const delivery = cart.fulfilment === "delivery" && Boolean(offered);
  const place = delivery ? cart.deliveryPlace : null;
  const zone = place ? zoneFor(config, place.suburb, place.postcode) : null;
  const quoted = cart.quote?.delivery;
  const cardAvailable = venue.paymentMethods.card && Boolean(STRIPE_KEY);
  const cashAvailable = delivery ? Boolean(offered?.cash_on_delivery) : venue.paymentMethods.cash;
  const [details, setDetails] = useState<Details>(() => initial || BLANK);
  const [errors, setErrors] = useState<Partial<Record<keyof Details | "place", string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [welcome, setWelcome] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [otherTip, setOtherTip] = useState("");
  const submittingRef = useRef(false);
  const { setDeliveryPlace, setFulfilment, setTip, tip } = cart;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // A returning customer's address, remembered on this device only.
  useEffect(() => {
    if (initial) return;
    const timer = window.setTimeout(() => {
      const saved = loadSavedAddress();
      if (!saved) return;
      setDetails((current) => ({
        ...current,
        addressLine1: current.addressLine1 || saved.address_line1,
        addressLine2: current.addressLine2 || saved.address_line2,
        instructions: current.instructions || saved.instructions,
        leaveAtDoor: current.leaveAtDoor || saved.leave_at_door,
      }));
      setDeliveryPlace(saved.suburb ? { suburb: saved.suburb, postcode: saved.postcode } : null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initial, setDeliveryPlace]);

  // A venue that stops offering delivery drops back to pickup.
  useEffect(() => {
    if (config && !config.offered && cart.fulfilment === "delivery") {
      const timer = window.setTimeout(() => setFulfilment("pickup"), 0);
      return () => window.clearTimeout(timer);
    }
  }, [config, cart.fulfilment, setFulfilment]);

  // Fall back to whichever payment method is actually on offer.
  const paymentMethod = details.paymentMethod === "card" && !cardAvailable && cashAvailable
    ? "cash"
    : details.paymentMethod === "cash" && !cashAvailable && cardAvailable
      ? "card"
      : details.paymentMethod;

  // A tip goes on the card payment, so it's offered only when paying by card.
  const tipsOn = delivery && Boolean(offered?.tips_enabled) && paymentMethod === "card";
  useEffect(() => {
    if (!tipsOn && tip) {
      const timer = window.setTimeout(() => setTip(0), 0);
      return () => window.clearTimeout(timer);
    }
  }, [tipsOn, tip, setTip]);

  const slots = useMemo(() => pickupSlots(status.today, status.pickup, now), [status.today, status.pickup, now]);
  const pickupStillValid = details.pickupTime && slots.some((slot) => slot.toISOString() === details.pickupTime);
  const deliverySlots = zone?.slots || [];
  const deliveryTimeValid = details.deliveryTime && deliverySlots.includes(details.deliveryTime);
  const asapOk = !zone || zone.asap.available;

  function update<K extends keyof Details>(key: K, value: Details[K]) {
    setDetails((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setFormError(null);
  }

  async function lookup(body: { phone?: string; email?: string }) {
    try {
      const result = await api.post<{ found?: boolean; customer?: { name?: string; email?: string; phone?: string } }>("/api/customers/lookup", body);
      const customer = result.customer;
      if (!customer?.name) return;
      setDetails((current) => ({
        ...current,
        name: current.name || customer.name || "",
        email: current.email || customer.email || "",
        phone: current.phone || customer.phone || "",
      }));
      setWelcome(`Welcome back, ${customer.name.split(" ")[0]}!`);
    } catch {
      // Prefill is a nicety; it must never block checkout.
    }
  }

  function validate() {
    const next: Partial<Record<keyof Details | "place", string>> = {};
    if (!details.name.trim()) next.name = "Please enter your name.";
    const phone = cleanPhone(details.phone);
    if (!phone) next.phone = delivery ? "We need a phone number so the driver can reach you." : "We need a phone number in case there's a problem with your order.";
    else if (!AU_PHONE.test(phone)) next.phone = "Enter an Australian number, like 0412 345 678 or 08 8186 5991.";
    if (details.email.trim() && !EMAIL.test(details.email.trim())) next.email = "That email address doesn't look right.";
    if (delivery) {
      if (!details.addressLine1.trim()) next.addressLine1 = "Enter your street address.";
      if (!place) next.place = "Choose your suburb.";
      if (details.timing === "scheduled" && !deliveryTimeValid) next.deliveryTime = "Choose a delivery time.";
    } else if (details.timing === "scheduled" && !pickupStillValid) {
      next.pickupTime = "Choose a pickup time.";
    }
    return next;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submittingRef.current) return;
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      document.querySelector<HTMLElement>(".checkout-form [aria-invalid='true']")?.focus();
      return;
    }
    if (deliveryProblem) {
      setFormError(deliveryProblem);
      return;
    }
    if (delivery && details.timing === "asap" && zone && !zone.asap.available) {
      setFormError(zone.asap.message || "Delivery isn't available as soon as possible right now. Choose a time.");
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    const finalDetails = { ...details, paymentMethod, phone: cleanPhone(details.phone) };
    const deliveredTo = delivery && place ? { ...place } : null;
    try {
      const order = await api.post<CreateOrderResponse>("/api/orders", {
        customer: {
          name: finalDetails.name.trim(),
          phone: finalDetails.phone,
          email: finalDetails.email.trim() || undefined,
          marketing_opt_in: finalDetails.marketingOptIn,
        },
        payment_method: paymentMethod,
        notes: finalDetails.notes.trim() || undefined,
        items: cart.orderItems(),
        discount_code: cart.discountCode || undefined,
        ...(deliveredTo
          ? {
            order_type: "delivery",
            delivery: {
              address_line1: finalDetails.addressLine1.trim(),
              address_line2: finalDetails.addressLine2.trim() || undefined,
              suburb: deliveredTo.suburb,
              postcode: deliveredTo.postcode,
              instructions: finalDetails.instructions.trim() || undefined,
              leave_at_door: finalDetails.leaveAtDoor,
            },
            delivery_time: finalDetails.timing === "scheduled" ? finalDetails.deliveryTime : undefined,
            tip: tipsOn && tip ? tip : undefined,
          }
          : { pickup_time: finalDetails.timing === "scheduled" ? finalDetails.pickupTime : undefined }),
      });
      if (deliveredTo) {
        saveAddress({
          address_line1: finalDetails.addressLine1.trim(),
          address_line2: finalDetails.addressLine2.trim(),
          suburb: deliveredTo.suburb,
          postcode: deliveredTo.postcode,
          instructions: finalDetails.instructions.trim(),
          leave_at_door: finalDetails.leaveAtDoor,
        });
      }
      if (paymentMethod === "cash") onCash(order, finalDetails, deliveredTo);
      else if (order.client_secret) onCard(order, finalDetails, deliveredTo);
      else setFormError(`Card payment couldn't be started. Please try again${cashAvailable ? (delivery ? " or choose to pay the driver" : " or choose to pay in store") : ""}.`);
    } catch (caught) {
      const error = caught as ApiError;
      const known = error.code ? RECOVERY[error.code] : null;
      setFormError(known ? `${known}${error.code === "OUTSIDE_SERVICE_WINDOW" ? ` (${error.message})` : ""}` : error.message);
      if (error.code && ["STORE_CLOSED", "ORDERS_PAUSED", "PICKUP_TOO_SOON", "PICKUP_OUTSIDE_HOURS"].includes(error.code)) status.refresh();
      if (error.code && STALE_DELIVERY.includes(error.code)) void refreshDelivery();
      if (error.code === "PAYMENT_METHOD_UNAVAILABLE") window.location.reload();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const closed = status.ordersPaused || status.acceptingOrders === false;
  const noPayment = !cardAvailable && !cashAvailable;
  // A real reason delivery can't go ahead (below the minimum), shown under the
  // address. A missing address isn't one: the button stays live so pressing it
  // names what's missing.
  const deliveryProblem = delivery && place && cart.quoteStatus === "ready" && quoted && !quoted.available && quoted.code !== "NEED_ADDRESS"
    ? quoted.message || "Delivery isn't available for this order."
    : null;
  const deliveryPricing = delivery && Boolean(place) && cart.quoteStatus === "loading";
  const deliveryBlocked = delivery && (Boolean(deliveryProblem) || deliveryPricing);

  return (
    <form className="order-details checkout-form" onSubmit={submit} noValidate>
      <p className="eyebrow">Step 1</p>
      <h2>{offered ? "Your order details." : "Your pickup details."}</h2>

      {status.ordersPaused ? <p className="order-notice order-notice-alert" role="alert"><strong>Online orders are paused.</strong> Please try again in a few minutes.</p> : null}
      {!status.ordersPaused && status.acceptingOrders === false ? <p className="order-notice order-notice-alert" role="alert"><strong>We&apos;re closed right now.</strong> You can place your order when the shop opens.</p> : null}
      {cart.quoteProblem ? <p className="order-notice order-notice-alert" role="alert">{cart.quoteProblem} <a href="/order">Edit your order</a></p> : null}

      {offered ? (
        <fieldset className="choice-cards fulfilment-choice">
          <legend>How would you like it?</legend>
          <label className={!delivery ? "is-selected" : ""}>
            <input type="radio" name="fulfilment" checked={!delivery} onChange={() => { setFulfilment("pickup"); setFormError(null); }} />
            <strong>Pickup</strong>
            <small>Collect from {venue.name}</small>
          </label>
          <label className={delivery ? "is-selected" : ""}>
            <input type="radio" name="fulfilment" checked={delivery} onChange={() => { setFulfilment("delivery"); setFormError(null); }} />
            <strong>Delivery</strong>
            <small>{deliverySummary(offered)}</small>
          </label>
        </fieldset>
      ) : null}
      {delivery && offered && !offered.open ? <p className="order-notice order-notice-alert" role="status">{offered.message}</p> : null}

      <div className="order-form-grid">
        <label>
          Name
          <input value={details.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "err-name" : undefined} />
          {errors.name ? <span className="field-error" id="err-name">{errors.name}</span> : null}
        </label>
        <label>
          Mobile number
          <input
            value={details.phone}
            onChange={(event) => update("phone", event.target.value)}
            onBlur={(event) => {
              const phone = cleanPhone(event.target.value);
              if (AU_PHONE.test(phone)) void lookup({ phone });
            }}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "err-phone" : "help-phone"}
          />
          {errors.phone
            ? <span className="field-error" id="err-phone">{errors.phone}</span>
            : <span className="field-help" id="help-phone">{delivery ? "So the driver can reach you." : "So we can reach you about this order."}</span>}
        </label>
        <label className="full-field">
          <span>Email <span className="field-optional">(optional)</span></span>
          <input
            value={details.email}
            onChange={(event) => {
              update("email", event.target.value);
              setWelcome("");
            }}
            onBlur={(event) => {
              const email = event.target.value.trim();
              if (EMAIL.test(email)) void lookup({ email });
            }}
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "err-email" : "help-email"}
          />
          {errors.email
            ? <span className="field-error" id="err-email">{errors.email}</span>
            : <span className="field-help" id="help-email">Add it and we&apos;ll send one confirmation with your receipt and tracking link.</span>}
        </label>
      </div>
      {welcome ? <p className="field-success" role="status">{welcome}</p> : null}

      {delivery && offered ? (
        <fieldset className="delivery-address">
          <legend>Where should we deliver?</legend>
          <div className="order-form-grid">
            <label className="full-field">
              Street address
              <input value={details.addressLine1} onChange={(event) => update("addressLine1", event.target.value)} autoComplete="address-line1"
                placeholder="12 Beach Road" aria-invalid={Boolean(errors.addressLine1)} aria-describedby={errors.addressLine1 ? "err-address" : undefined} />
              {errors.addressLine1 ? <span className="field-error" id="err-address">{errors.addressLine1}</span> : null}
            </label>
            <label>
              <span>Unit or apartment <span className="field-optional">(optional)</span></span>
              <input value={details.addressLine2} onChange={(event) => update("addressLine2", event.target.value)} autoComplete="address-line2" placeholder="Unit 3" />
            </label>
            <label>
              Suburb
              <select
                value={place ? `${place.suburb}|${place.postcode}` : ""}
                onChange={(event) => {
                  const [suburb, postcode] = event.target.value.split("|");
                  setDeliveryPlace(suburb ? { suburb, postcode } : null);
                  setErrors((current) => ({ ...current, place: undefined, deliveryTime: undefined }));
                  setDetails((current) => ({ ...current, deliveryTime: "" }));
                  setFormError(null);
                }}
                aria-invalid={Boolean(errors.place)}
                aria-describedby={errors.place ? "err-place" : "help-place"}
              >
                <option value="">Choose your suburb</option>
                {offered.areas.map((area) => (
                  <option key={`${area.suburb}|${area.postcode}`} value={`${area.suburb}|${area.postcode}`}>{area.suburb} {area.postcode}</option>
                ))}
              </select>
              {errors.place
                ? <span className="field-error" id="err-place">{errors.place}</span>
                : <span className="field-help" id="help-place">Not listed? We don&apos;t deliver there yet, but pickup is always on.</span>}
            </label>
          </div>
          <label className="order-notes">
            <span>Delivery notes <span className="field-optional">(optional)</span></span>
            <textarea value={details.instructions} onChange={(event) => update("instructions", event.target.value)} maxLength={300}
              placeholder="Gate code, which door, anything that helps the driver find you." />
          </label>
          <label className="check-control">
            <input type="checkbox" checked={details.leaveAtDoor} onChange={(event) => update("leaveAtDoor", event.target.checked)} />
            <span>Leave it at the door if I don&apos;t answer</span>
          </label>
          {place && quoted ? (
            quoted.available ? (
              <p className="field-success delivery-fee-note" role="status">
                {quoted.free ? `Free delivery to ${place.suburb}.` : `Delivery to ${place.suburb} is ${formatMoney(quoted.fee)}.`}
                {!quoted.free && quoted.free_over ? ` Free when your food comes to ${formatMoney(quoted.free_over)}.` : ""}
              </p>
            ) : quoted.message ? <p className="order-notice order-notice-alert" role="status">{quoted.message}</p> : null
          ) : null}
        </fieldset>
      ) : null}

      <fieldset className="timing-choice">
        <legend>{delivery ? "When would you like it delivered?" : "When would you like to pick it up?"}</legend>
        <label>
          <input type="radio" name="timing" checked={details.timing === "asap"} onChange={() => update("timing", "asap")} disabled={delivery && !asapOk} />{" "}
          {delivery
            ? zone?.asap.available ? `As soon as possible, about ${zone.asap.minutes} min` : "As soon as possible"
            : <>As soon as it&apos;s ready</>}
        </label>
        <label>
          <input type="radio" name="timing" checked={details.timing === "scheduled"} onChange={() => update("timing", "scheduled")}
            disabled={delivery ? (Boolean(zone) && !deliverySlots.length) : !slots.length} /> Choose a time today
        </label>
      </fieldset>
      {delivery && zone && !zone.asap.available && zone.asap.message ? <p className="field-help">{zone.asap.message}</p> : null}
      {details.timing === "scheduled" ? (
        <div className="order-form-grid schedule-fields">
          {delivery ? (
            <label>
              Delivery time
              {!place ? <span className="field-help">Choose your suburb first.</span>
                : deliverySlots.length ? (
                  <select value={deliveryTimeValid ? details.deliveryTime : ""} onChange={(event) => update("deliveryTime", event.target.value)} aria-invalid={Boolean(errors.deliveryTime)}>
                    <option value="">Select a time</option>
                    {deliverySlots.map((slot) => <option key={slot} value={slot}>{formatVenueTime(slot)}</option>)}
                  </select>
                ) : <span className="field-help">No more delivery times today.</span>}
              {errors.deliveryTime ? <span className="field-error">{errors.deliveryTime}</span> : null}
            </label>
          ) : (
            <label>
              Pickup time
              {slots.length ? (
                <select value={pickupStillValid ? details.pickupTime : ""} onChange={(event) => update("pickupTime", event.target.value)} aria-invalid={Boolean(errors.pickupTime)}>
                  <option value="">Select a time</option>
                  {slots.map((slot) => <option key={slot.toISOString()} value={slot.toISOString()}>{formatVenueTime(slot)}</option>)}
                </select>
              ) : <span className="field-help">No more pickup times today.</span>}
              {errors.pickupTime ? <span className="field-error">{errors.pickupTime}</span> : null}
            </label>
          )}
        </div>
      ) : null}

      <label className="order-notes">
        Order notes
        <textarea value={details.notes} onChange={(event) => update("notes", event.target.value)} maxLength={500} placeholder="Anything the kitchen should know. For allergies, please call us before ordering." />
      </label>

      <fieldset className="choice-cards payment-choice">
        <legend className="sr-only">How would you like to pay?</legend>
        {cardAvailable ? (
          <label className={paymentMethod === "card" ? "is-selected" : ""}>
            <input type="radio" name="payment" value="card" checked={paymentMethod === "card"} onChange={() => update("paymentMethod", "card")} />
            <strong>Pay now by card</strong>
            <small>Secure payment by Stripe</small>
          </label>
        ) : null}
        {cashAvailable ? (
          <label className={paymentMethod === "cash" ? "is-selected" : ""}>
            <input type="radio" name="payment" value="cash" checked={paymentMethod === "cash"} onChange={() => update("paymentMethod", "cash")} />
            <strong>{delivery ? "Pay the driver" : "Pay in store"}</strong>
            <small>{delivery ? "Cash when it arrives" : "Pay when you collect"}</small>
          </label>
        ) : null}
      </fieldset>
      {noPayment ? <p className="order-notice order-notice-alert" role="alert">Online payment is unavailable right now. Please call <a href={venue.telHref}>{venue.phone}</a> to order.</p> : null}

      {tipsOn ? (
        <fieldset className="tip-choice">
          <legend>Add a tip for the driver? <span className="field-optional">(optional, all of it goes to them)</span></legend>
          <div className="tip-options">
            {TIPS.map((amount) => (
              <button key={amount} type="button" className={tip === amount && !otherTip ? "is-selected" : ""} aria-pressed={tip === amount && !otherTip}
                onClick={() => { setOtherTip(""); setTip(amount); }}>
                {amount ? formatMoney(amount) : "No tip"}
              </button>
            ))}
            <label className="tip-other">
              <span className="sr-only">Another amount</span>
              <input inputMode="decimal" placeholder="Other" value={otherTip}
                onChange={(event) => {
                  const value = event.target.value.replace(/[^\d.]/g, "");
                  setOtherTip(value);
                  const amount = Math.round(Number(value) * 100) / 100;
                  setTip(Number.isFinite(amount) && amount > 0 ? Math.min(amount, 200) : 0);
                }} />
            </label>
          </div>
        </fieldset>
      ) : null}

      <label className="check-control consent-control">
        <input type="checkbox" checked={details.marketingOptIn} onChange={(event) => update("marketingOptIn", event.target.checked)} />
        <span>Send me occasional deals from {venue.name}. You can unsubscribe at any time.</span>
      </label>

      {formError ? <p className="order-notice order-notice-alert" role="alert">{formError}</p> : null}

      <button className="button checkout-submit" type="submit" disabled={submitting || closed || noPayment || Boolean(cart.quoteProblem) || (delivery && (!offered?.open || deliveryBlocked))}>
        {submitting
          ? (paymentMethod === "cash" ? "Placing your order…" : "Preparing payment…")
          : paymentMethod === "cash"
            ? `Place order · pay ${formatMoney(cart.total)} ${delivery ? "to the driver" : "in store"}`
            : "Continue to payment"}
      </button>
      <p className="checkout-note">By placing an order you agree to our <a href="/privacy">privacy policy</a>.{offered ? "" : " Orders are for pickup only."}</p>
    </form>
  );
}

function PaymentStep({ pending, onBack, onPaid }: { pending: PendingCard; onBack: () => void; onPaid: () => void }) {
  const stripe = getStripe();
  if (!stripe || !pending.order.client_secret) {
    return (
      <section className="order-details">
        <h2>Card payment is unavailable.</h2>
        <p>Please go back and choose another way to pay, or call the shop.</p>
        <button className="button button-secondary" type="button" onClick={onBack}>Back</button>
      </section>
    );
  }
  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret: pending.order.client_secret,
        fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" }],
        appearance: {
          theme: "flat",
          variables: {
            colorPrimary: "#c84e38",
            colorBackground: "#fff8e8",
            colorText: "#0a2028",
            colorDanger: "#c84e38",
            fontFamily: '"DM Sans", Arial, sans-serif',
            borderRadius: "0px",
          },
          rules: {
            ".Input": { border: "1px solid rgba(10, 32, 40, 0.24)" },
            ".Tab": { border: "1px solid rgba(10, 32, 40, 0.24)" },
          },
        },
      }}
    >
      <PaymentForm pending={pending} onBack={onBack} onPaid={onPaid} />
    </Elements>
  );
}

function PaymentForm({ pending, onBack, onPaid }: { pending: PendingCard; onBack: () => void; onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { total } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pay(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    setError(null);
    // A redirect-based payment method lands on the private tracking page,
    // which follows the order once Stripe's webhook confirms it.
    const returnUrl = pending.order.tracking_url || `${window.location.origin}/checkout`;
    const result = await stripe.confirmPayment({ elements, redirect: "if_required", confirmParams: { return_url: returnUrl } });
    if (result.error) {
      setError(result.error.message || "Your payment didn't go through. Please try again.");
      setBusy(false);
      return;
    }
    try {
      await api.post("/api/orders/confirm", { payment_intent_id: result.paymentIntent.id });
    } catch (caught) {
      // The Stripe webhook is the fallback that moves the order to the kitchen;
      // blocking a paid customer here would be worse. Log it for diagnosis.
      console.error("[checkout] confirm failed; relying on the Stripe webhook", caught);
    }
    onPaid();
  }

  const { details, delivery, order } = pending;
  const when = delivery
    ? order.delivery?.scheduled && order.delivery.promised_at ? ` around ${formatVenueTime(order.delivery.promised_at)}` : ", as soon as possible"
    : details.timing === "scheduled" && details.pickupTime ? ` at ${formatVenueTime(details.pickupTime)}` : ", as soon as it's ready";

  return (
    <form className="order-details checkout-form" onSubmit={pay}>
      <p className="eyebrow">Step 2</p>
      <h2>Pay by card.</h2>
      <p className="checkout-note">
        {delivery ? `Delivery to ${addressText(details, delivery)}${when}.` : `Pickup for ${details.name}${when}.`}
      </p>
      <div className="stripe-field">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      {error ? <p className="order-notice order-notice-alert" role="alert">{error}</p> : null}
      <div className="order-review-actions">
        <button className="button checkout-submit" type="submit" disabled={!stripe || busy}>
          {busy ? "Processing…" : `Pay ${formatMoney(total)}`}
        </button>
        <button className="text-button" type="button" onClick={onBack} disabled={busy}>Back to details</button>
      </div>
    </form>
  );
}
