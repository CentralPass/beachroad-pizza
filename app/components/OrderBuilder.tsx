"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BUSINESS } from "../lib/site-data";
import { formatPrice, useCart, type CartItem } from "./CartProvider";

function QuantityControl({ item }: { item: CartItem }) {
  const { changeQuantity } = useCart();

  return (
    <div className="quantity-control" aria-label={`Quantity for ${item.name}`}>
      <button type="button" onClick={() => changeQuantity(item.id, item.quantity - 1)} aria-label={`Remove one ${item.name}`}>−</button>
      <span>{item.quantity}</span>
      <button type="button" onClick={() => changeQuantity(item.id, item.quantity + 1)} aria-label={`Add one ${item.name}`}>+</button>
    </div>
  );
}

export function OrderBuilder() {
  const { items, subtotal, removeItem } = useCart();
  const [fulfilment, setFulfilment] = useState<"Pickup" | "Delivery">("Pickup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [timing, setTiming] = useState<"ASAP" | "Schedule">("ASAP");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [copied, setCopied] = useState(false);

  const deliveryFee = fulfilment === "Delivery" ? 8 : 0;
  const estimatedTotal = subtotal + deliveryFee;
  const summary = useMemo(() => {
    const lines = items.map((item) => `${item.quantity} × ${item.name} (${item.option}) — ${formatPrice(item.quantity * item.unitPrice)}`);
    return [
      "Beach Road Pizza order request",
      ...lines,
      `Fulfilment: ${fulfilment}${fulfilment === "Delivery" ? ` — ${address}` : ""}`,
      `When: ${timing === "ASAP" ? "As soon as possible" : `${date} at ${time}`}`,
      `Customer: ${name} — ${phone}`,
      notes ? `Notes: ${notes}` : "",
      `Estimated total: ${formatPrice(estimatedTotal)}`,
    ].filter(Boolean).join("\n");
  }, [address, date, estimatedTotal, fulfilment, items, name, notes, phone, time, timing]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReviewed(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copySummary() {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  if (reviewed) {
    return (
      <section className="order-review" aria-labelledby="order-review-title">
        <p className="eyebrow">Final review</p>
        <h2 id="order-review-title">Ready for checkout.</h2>
        <p className="checkout-note">
          Your order has been prepared, but it has not been submitted or charged. Secure Stripe payment is the final connection still to come.
        </p>
        <pre>{summary}</pre>
        <div className="order-review-actions">
          <button className="button" type="button" onClick={copySummary}>{copied ? "Copied" : "Copy order summary"}</button>
          <a className="button button-secondary" href={BUSINESS.phoneHref}>Call {BUSINESS.phoneDisplay}</a>
          <button className="text-button" type="button" onClick={() => setReviewed(false)}>Edit this order</button>
        </div>
      </section>
    );
  }

  return (
    <form className="order-builder" onSubmit={submit}>
      <section className="order-basket" aria-labelledby="order-basket-title">
        <div className="order-card-head">
          <div>
            <p className="eyebrow">Step 1</p>
            <h2 id="order-basket-title">Your favourites.</h2>
          </div>
          <a className="text-link" href="#menu-explorer-title">Add from menu</a>
        </div>
        {items.length ? (
          <div className="order-lines">
            {items.map((item) => (
              <article className="order-line" key={item.id}>
                {item.image ? <img src={item.image} alt="" width="130" height="100" /> : <span className="order-line-mark" aria-hidden="true">BRP</span>}
                <div className="order-line-copy">
                  <strong>{item.name}</strong>
                  <small>{item.option} · {formatPrice(item.unitPrice)} each</small>
                  <QuantityControl item={item} />
                </div>
                <div className="order-line-total">
                  <strong>{formatPrice(item.unitPrice * item.quantity)}</strong>
                  <button type="button" onClick={() => removeItem(item.id)}>Remove</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="order-empty">
            <h3>Your cart is empty.</h3>
            <p>Browse the menu below and tap “Add to order” on anything you fancy.</p>
            <a className="button" href="#menu-explorer-title">Start with the menu</a>
          </div>
        )}
      </section>

      <section className="order-details" aria-labelledby="order-details-title">
        <p className="eyebrow">Step 2</p>
        <h2 id="order-details-title">How should we get it to you?</h2>
        <fieldset className="choice-cards">
          <legend className="sr-only">Choose pickup or delivery</legend>
          {(["Pickup", "Delivery"] as const).map((option) => (
            <label className={fulfilment === option ? "is-selected" : ""} key={option}>
              <input type="radio" name="fulfilment" value={option} checked={fulfilment === option} onChange={() => setFulfilment(option)} />
              <strong>{option}</strong>
              <small>{option === "Pickup" ? "Collect from 29B Beach Road" : "From $8, confirmed at checkout"}</small>
            </label>
          ))}
        </fieldset>

        <div className="order-form-grid">
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
          </label>
          <label>
            Mobile number
            <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" inputMode="tel" autoComplete="tel" required />
          </label>
          {fulfilment === "Delivery" ? (
            <label className="full-field">
              Delivery address
              <input value={address} onChange={(event) => setAddress(event.target.value)} autoComplete="street-address" required />
            </label>
          ) : null}
        </div>

        <fieldset className="timing-choice">
          <legend>When would you like it?</legend>
          <label><input type="radio" name="timing" checked={timing === "ASAP"} onChange={() => setTiming("ASAP")} /> As soon as possible</label>
          <label><input type="radio" name="timing" checked={timing === "Schedule"} onChange={() => setTiming("Schedule")} /> Schedule a time</label>
        </fieldset>
        {timing === "Schedule" ? (
          <div className="order-form-grid schedule-fields">
            <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
            <label>Time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></label>
          </div>
        ) : null}
        <label className="order-notes">
          Order notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Dietary notes, delivery directions or anything the team should know" />
        </label>
      </section>

      <aside className="order-total-card" aria-label="Estimated order total">
        <div><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
        <div><span>{fulfilment === "Delivery" ? "Delivery from" : "Pickup"}</span><strong>{formatPrice(deliveryFee)}</strong></div>
        <div className="order-grand-total"><span>Estimated total</span><strong>{formatPrice(estimatedTotal)}</strong></div>
        <p>Extras, delivery distance and final availability will be confirmed before payment.</p>
        <button className="button" type="submit" disabled={!items.length}>Review order</button>
      </aside>
    </form>
  );
}
