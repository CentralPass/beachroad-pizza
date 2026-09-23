"use client";

import Link from "next/link";
import { useEffect } from "react";
import { trackPurchase } from "../../lib/analytics";
import { formatMoney, formatVenueDateTime, toNumber } from "../../lib/format";
import { orderReference } from "../../lib/venue";
import { ModifierList, lineUnitPrice, useCart } from "../CartProvider";
import { useVenue } from "../providers/VenueProvider";
import { forgetReceipt, type ReceiptSnapshot } from "./receipt";

/**
 * The customer's confirmation and tax invoice. Renders only from the snapshot,
 * then clears the live cart so leaving this page (link, Back, reopening the
 * tab) never resurrects a submitted order.
 */
export function OrderReceipt({ receipt, onNewOrder }: { receipt: ReceiptSnapshot; onNewOrder?: () => void }) {
  const venue = useVenue();
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    trackPurchase(receipt.orderId, receipt.total);
  }, [receipt.orderId, receipt.total]);

  const reference = orderReference(receipt.orderId);
  const isCash = receipt.paymentMethod === "cash";

  return (
    <section className="order-review order-receipt" aria-labelledby="receipt-title">
      <div className="receipt-print-head" aria-hidden="true">
        <strong>{venue.name}</strong>
        <span>{venue.address}</span>
      </div>
      <p className="eyebrow">Order received</p>
      <h2 id="receipt-title">Thanks, {receipt.name.split(" ")[0]}. We&apos;re on it.</h2>
      <p className="checkout-note">
        {receipt.email
          ? <>We&apos;ll email your receipt and private tracking link to {receipt.email}. Keep this page handy too.</>
          : <>Keep this page or your tracking link. It&apos;s how you follow this order.</>}
      </p>

      <dl className="receipt-meta">
        <div><dt>Order reference</dt><dd>{reference}</dd></div>
        <div><dt>Placed</dt><dd>{formatVenueDateTime(receipt.placedAt, true)}</dd></div>
        <div><dt>Pickup</dt><dd>{receipt.pickupTime ? formatVenueDateTime(receipt.pickupTime) : "As soon as it's ready"}</dd></div>
        <div><dt>Collect from</dt><dd>{venue.name}, {venue.address}</dd></div>
        <div><dt>Name</dt><dd>{receipt.name}</dd></div>
      </dl>

      <div className="receipt-card">
        <h3>Your order</h3>
        {receipt.lines.map((line) => (
          <div className="receipt-line" key={line.id}>
            <div>
              <strong>{line.qty} × {line.item.name}</strong>
              <ModifierList modifiers={line.modifiers} />
            </div>
            <span>{formatMoney(lineUnitPrice(line) * line.qty)}</span>
          </div>
        ))}
        <div className="receipt-totals">
          <div><span>Subtotal</span><span>{formatMoney(receipt.subtotal)}</span></div>
          {receipt.offerApplied && receipt.offerDiscount > 0 ? (
            <div className="total-saving"><span>{receipt.offerApplied.badge_label}</span><span>−{formatMoney(receipt.offerDiscount)}</span></div>
          ) : null}
          {receipt.discountAmount > 0 ? (
            <div className="total-saving"><span>Discount{receipt.discountCode ? ` (${receipt.discountCode})` : ""}</span><span>−{formatMoney(receipt.discountAmount)}</span></div>
          ) : null}
          {receipt.surcharge && toNumber(receipt.surcharge.amount) > 0 ? (
            <div><span>{receipt.surcharge.label || `Public holiday surcharge (${receipt.surcharge.percent}%)`}</span><span>+{formatMoney(receipt.surcharge.amount)}</span></div>
          ) : null}
          <div className="receipt-grand-total"><span>Total</span><strong>{formatMoney(receipt.total)}</strong></div>
          <p>
            Includes GST of {formatMoney(receipt.gst)}
            {venue.abn ? <><br />ABN {venue.abn}</> : null}
          </p>
        </div>
      </div>

      <p className="receipt-payment">
        {isCash
          ? <><strong>Pay in store:</strong> please have {formatMoney(receipt.total)} ready when you collect. Show this screen at the counter.</>
          : <><strong>Paid by card.</strong> Show this screen{receipt.email ? " or your email" : ""} when you collect.</>}
      </p>

      <div className="order-review-actions receipt-actions">
        {receipt.trackingUrl ? <a className="button" href={receipt.trackingUrl}>Track your order</a> : null}
        <button className="button button-secondary" type="button" onClick={() => window.print()}>Save or print receipt</button>
        <Link
          className="text-button"
          href="/"
          onClick={() => {
            forgetReceipt();
            onNewOrder?.();
          }}
        >
          Back to home
        </Link>
      </div>
    </section>
  );
}
