"use client";

import { summariseHours } from "../lib/hours";
import { HOURS } from "../lib/site-data";
import { useBookingConfig } from "../lib/useBookingConfig";
import { useStoreStatus } from "./providers/StoreStatusProvider";
import { useVenue } from "./providers/VenueProvider";

// Small live pieces for server-rendered pages. Each starts from the venue's
// last known details and switches to the admin-managed values once loaded.

export function VenuePhoneLink({ prefix = "Call ", label, className }: { prefix?: string; label?: string; className?: string }) {
  const venue = useVenue();
  return <a className={className} href={venue.telHref}>{label ?? `${prefix}${venue.phone}`}</a>;
}

export function VenueAddress() {
  return <>{useVenue().address}</>;
}

export function VenueName() {
  return <>{useVenue().name}</>;
}

/** Weekly hours rows; falls back to the published hours until the live ones load. */
export function useHoursRows() {
  const { storeHours } = useStoreStatus();
  const live = summariseHours(storeHours);
  return live.length ? live : HOURS;
}

export function HoursRows({ variant }: { variant: "footer" | "list" | "contact" }) {
  const rows = useHoursRows();
  if (variant === "footer") {
    return <>{rows.map((row) => <p key={row.days}><strong>{row.days}</strong>{row.hours}</p>)}</>;
  }
  if (variant === "contact") {
    return <>{rows.map((row) => <p key={row.days}><span>{row.days}</span>{row.hours}</p>)}</>;
  }
  return <>{rows.map((row) => <div key={row.days}><span>{row.days}</span><strong>{row.hours}</strong></div>)}</>;
}

/** Special day (holiday hours or surcharge) note, when one applies today. */
export function TodayNote() {
  const { today } = useStoreStatus();
  if (!today?.is_special_day) return null;
  const parts = [today.label, today.surcharge_percent > 0 ? (today.surcharge_label || `${today.surcharge_percent}% public holiday surcharge today`) : null].filter(Boolean);
  return parts.length ? <small className="today-note">Today: {parts.join(" · ")}</small> : null;
}

/** The Book link only exists when online bookings are live for this venue. */
export function BookingsNavLink({ className }: { className?: string }) {
  const { online } = useBookingConfig();
  return online ? <a className={className} href="/bookings">Book a table</a> : null;
}
