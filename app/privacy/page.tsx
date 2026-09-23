import type { Metadata } from "next";
import { VenueAddress, VenueName, VenuePhoneLink } from "../components/VenueBits";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Beach Road Pizza collects, uses and protects your information when you order, book or join the mailing list.",
  robots: { index: true, follow: true },
};

const adsEnabled = Boolean((process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "").trim());

export default function PrivacyPage() {
  return (
    <section className="legal-page">
      <div className="shell legal-content">
        <p className="eyebrow">Privacy</p>
        <h1>Your information, handled with care.</h1>
        <p>Last updated: September 2026. This policy covers the Beach Road Pizza website, online ordering, table bookings and our mailing list.</p>

        <h2>What we collect</h2>
        <p>When you order, book a table or join our mailing list, we collect:</p>
        <ul>
          <li><strong>Your name</strong>, so the team can find your order or booking.</li>
          <li><strong>Your phone number</strong>, which is required. It is how we identify you and contact you about your order, and we may text you a confirmation with your tracking link.</li>
          <li><strong>Your email address</strong>, which is optional for orders. If you give it, we send one confirmation with your receipt and private tracking link.</li>
          <li><strong>Your order</strong>: items, options, notes, totals and pickup time. Over time this forms your order history with us.</li>
          <li><strong>Booking details</strong>: date, time, party size and any request you add.</li>
          <li><strong>Your marketing choice</strong>: whether, when and where you agreed to hear from us.</li>
        </ul>

        <h2>Why we use it</h2>
        <ul>
          <li>To take, prepare and hand over your order, and to hold your table.</li>
          <li>To contact you if something about your order or booking changes.</li>
          <li>To recognise you as a returning customer so checkout is quicker. Checkout can look up your name from your phone number or email; this never blocks an order.</li>
          <li>Only if you opt in, to send you occasional deals and news.</li>
        </ul>

        <h2>Payments</h2>
        <p>Card payments are processed by Stripe. Your card details go straight to Stripe and we never see or store your full card number. If you choose to pay in store, no card details are collected online.</p>

        <h2>Marketing</h2>
        <p>We only send marketing if you tick the box at checkout or join the mailing list. Placing an order does not sign you up. Every marketing email and text includes a way to unsubscribe, and you can also ask us directly.</p>

        <h2>Who we share it with</h2>
        <p>We share information only where it is needed to run the service:</p>
        <ul>
          <li><strong>Stripe</strong>, to process card payments.</li>
          <li><strong>CentralPass</strong>, which provides and hosts our ordering, booking and kitchen systems on our behalf.</li>
          <li><strong>Email and SMS providers</strong>, used to send order and booking messages, and marketing only where you opted in.</li>
          <li><strong>Delivery platforms</strong>: if you order through Uber Eats or DoorDash, that platform&apos;s own privacy policy applies, not this one.</li>
          {adsEnabled ? <li><strong>Google</strong>: we use Google Ads measurement to understand which ads lead to orders. It records page visits and completed orders, never your name, contact details or private tracking links.</li> : null}
        </ul>
        <p>We don&apos;t otherwise disclose your information unless the law requires it.</p>

        <h2>How long we keep it</h2>
        <p>Order and payment records are kept for as long as we need them for tax and accounting, which in Australia is generally five years. Private order tracking links expire after a short time. You can ask us to delete your customer profile and marketing details at any time.</p>

        <h2>Your rights</h2>
        <ul>
          <li>Ask to see the personal information we hold about you.</li>
          <li>Ask us to correct it.</li>
          <li>Ask us to delete it, where we are not required to keep it.</li>
          <li>Stop marketing at any time.</li>
        </ul>

        <h2>Cookies and browser storage</h2>
        <p>
          The site uses your browser&apos;s session storage to remember your cart, your last receipt and which promotions you have closed.
          {adsEnabled ? " Google Ads measurement sets cookies to attribute orders to ads." : " There are no advertising or analytics trackers."}
          {" "}Stripe may set its own cookies during card payment to prevent fraud.
        </p>

        <h2>Contact us</h2>
        <p>
          For any privacy question or request, contact <VenueName /> at <VenueAddress />, or <VenuePhoneLink prefix="call " />.
        </p>
      </div>
    </section>
  );
}
