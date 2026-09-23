import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "../components/BreadcrumbJsonLd";
import { BookingPanel } from "../components/bookings/BookingForm";
import { VenueAddress, VenuePhoneLink } from "../components/VenueBits";

export const metadata: Metadata = {
  title: "Book a table",
  description: "Book a table at Beach Road Pizza in Christies Beach.",
};

export default function BookingsPage() {
  return (
    <>
      <BreadcrumbJsonLd name="Book a table" path="/bookings" />
      <section className="order-hero booking-hero">
        <div className="shell">
          <p className="eyebrow">Eat in</p>
          <h1>Grab a table.</h1>
          <p>Pick your group size, day and time. We&apos;ll have the ovens going.</p>
        </div>
      </section>
      <div className="shell order-page booking-layout">
        <section className="order-details">
          <BookingPanel />
        </section>
        <aside className="order-total-card booking-aside">
          <p className="eyebrow">Good to know</p>
          <p><strong>Big group or a celebration?</strong> Give us a call and we&apos;ll sort it out.</p>
          <p><VenueAddress /></p>
          <VenuePhoneLink className="button" />
          <a className="text-link" href="/menu">Browse the menu</a>
        </aside>
      </div>
    </>
  );
}
