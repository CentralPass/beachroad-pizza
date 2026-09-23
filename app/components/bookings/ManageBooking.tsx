"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, newRequestId } from "../../lib/api";
import { formatClock, formatVenueDateTime } from "../../lib/format";
import { addDays, dayLabel, venueDate } from "../../lib/hours";
import type { Booking, BookingAvailability, BookingConfig } from "../../lib/types";
import { useVenue } from "../providers/VenueProvider";

const STATUS: Record<string, string> = {
  pending: "Waiting for confirmation",
  confirmed: "Confirmed",
  arrived: "You've arrived",
  seated: "You're seated, enjoy",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "Marked as a no-show",
};

/**
 * The guest's own booking, reached from the confirmation link. No login: the
 * token in the URL is the authentication. Changes are requests the venue
 * confirms, never applied automatically.
 */
export function ManageBooking({ token }: { token: string }) {
  const venue = useVenue();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [hubReady, setHubReady] = useState(false);
  const [maxParty, setMaxParty] = useState(12);

  const [changeOpen, setChangeOpen] = useState(false);
  const [changeSent, setChangeSent] = useState(false);
  const [change, setChange] = useState({ date: venueDate(), time: "", party: 2 });
  const [note, setNote] = useState("");
  const [slots, setSlots] = useState<BookingAvailability | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get<BookingConfig>("/api/bookings/config")
      .then((config) => {
        setHubReady(Boolean(config.hub_configured));
        setMaxParty(config.max_party_size || 12);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.get<Booking>(`/api/bookings/manage/${encodeURIComponent(token)}`)
      .then((result) => {
        setBooking(result);
        setChange({ date: venueDate(new Date(result.booked_for)), time: "", party: result.party_size });
      })
      .catch(() => setError("We couldn't find that booking. The link may be out of date."))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!changeOpen) return;
    let active = true;
    const clear = window.setTimeout(() => { if (active) setSlots(null); }, 0);
    api.get<BookingAvailability>(`/api/bookings/availability?date=${change.date}&party_size=${change.party}`)
      .then((result) => { if (active) setSlots(result); })
      .catch(() => { if (active) setSlots({ date: change.date, open: false, reason: "We couldn't check availability.", slots: [] }); });
    return () => {
      active = false;
      window.clearTimeout(clear);
    };
  }, [changeOpen, change.date, change.party]);

  const dates = useMemo(() => Array.from({ length: 30 }, (_, index) => addDays(venueDate(), index)), []);
  const changeable = booking ? ["pending", "confirmed"].includes(booking.status) : false;

  async function cancel() {
    setCancelling(true);
    setError(null);
    try {
      setBooking(await api.post<Booking>(`/api/bookings/manage/${encodeURIComponent(token)}/cancel`, {}));
      setConfirmCancel(false);
    } catch (caught) {
      setError((caught as Error).message || "We couldn't cancel that. Please call us.");
    } finally {
      setCancelling(false);
    }
  }

  async function requestChange(event: FormEvent) {
    event.preventDefault();
    if (!booking) return;
    if (!change.time) {
      setChangeError("Choose a time for the new booking.");
      return;
    }
    setSending(true);
    setChangeError(null);
    try {
      const body = `Please change my booking to ${dayLabel(change.date)} at ${formatClock(change.time)} for ${change.party} ${change.party === 1 ? "guest" : "guests"}.${note.trim() ? ` ${note.trim()}` : ""}`;
      await api.post(`/api/bookings/manage/${encodeURIComponent(token)}/request-change`, {
        request_id: newRequestId(),
        revision: booking.revision,
        body: body.slice(0, 1500),
        requested: { date: change.date, time: change.time, party_size: change.party },
      });
      setChangeSent(true);
      setChangeOpen(false);
    } catch (caught) {
      setChangeError((caught as Error).message || "We couldn't send that request. Please call us.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="order-details manage-booking">
      <p className="eyebrow">Your booking</p>
      {loading ? <p role="status">Loading…</p> : null}

      {!loading && !booking ? (
        <>
          <h1>Booking not found.</h1>
          <p>{error}</p>
          <div className="button-row">
            <a className="button" href={venue.telHref}>Call {venue.phone}</a>
            <a className="button button-secondary" href="/bookings">Make a new booking</a>
          </div>
        </>
      ) : null}

      {booking ? (
        <>
          <h1>{booking.status === "cancelled" ? "Booking cancelled." : `Table for ${booking.party_size}.`}</h1>
          <dl className="receipt-meta">
            <div><dt>When</dt><dd>{formatVenueDateTime(booking.booked_for)}</dd></div>
            <div><dt>Guests</dt><dd>{booking.party_size}</dd></div>
            <div><dt>Name</dt><dd>{booking.name}</dd></div>
            <div><dt>Reference</dt><dd>{booking.reference}</dd></div>
            <div><dt>Status</dt><dd>{STATUS[booking.status] || booking.status}</dd></div>
            {booking.notes ? <div><dt>Notes</dt><dd>{booking.notes}</dd></div> : null}
          </dl>

          {error ? <p className="order-notice order-notice-alert" role="alert">{error}</p> : null}
          {changeSent ? (
            <p className="order-notice" role="status"><strong>Change requested.</strong> We&apos;ll be in touch to confirm. Your booking stays as shown until we do.</p>
          ) : null}

          {changeable && hubReady && !changeSent ? (
            changeOpen ? (
              <form className="booking-form" onSubmit={requestChange}>
                <div className="order-form-grid">
                  <label>
                    New date
                    <select value={change.date} onChange={(event) => setChange((current) => ({ ...current, date: event.target.value, time: "" }))}>
                      {dates.map((value) => <option key={value} value={value}>{dayLabel(value)}</option>)}
                    </select>
                  </label>
                  <label>
                    Guests
                    <select value={change.party} onChange={(event) => setChange((current) => ({ ...current, party: Number(event.target.value), time: "" }))}>
                      {Array.from({ length: maxParty }, (_, index) => index + 1).map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </label>
                </div>
                <fieldset>
                  <legend>New time</legend>
                  {!slots ? <p className="field-help" role="status">Checking availability…</p> : slots.slots.filter((slot) => slot.available && slot.seats_left >= change.party).length ? (
                    <div className="chip-row">
                      {slots.slots.filter((slot) => slot.available && slot.seats_left >= change.party).map((slot) => (
                        <button key={slot.time} type="button" className={change.time === slot.time ? "is-active" : ""} aria-pressed={change.time === slot.time} onClick={() => setChange((current) => ({ ...current, time: slot.time }))}>
                          {formatClock(slot.time)}
                        </button>
                      ))}
                    </div>
                  ) : <p className="field-help">{slots.reason || "No times available that day. Try another date or call us."}</p>}
                </fieldset>
                <label className="order-notes"><span>Anything else? <span className="field-optional">(optional)</span></span><textarea rows={2} maxLength={400} value={note} onChange={(event) => setNote(event.target.value)} /></label>
                {changeError ? <p className="order-notice order-notice-alert" role="alert">{changeError}</p> : null}
                <div className="button-row">
                  <button className="button" type="submit" disabled={sending || !change.time}>{sending ? "Sending…" : "Send change request"}</button>
                  <button className="button button-secondary" type="button" onClick={() => setChangeOpen(false)}>Never mind</button>
                </div>
              </form>
            ) : (
              <button className="button button-secondary" type="button" onClick={() => setChangeOpen(true)}>Change date, time or guests</button>
            )
          ) : null}

          {changeable ? (
            confirmCancel ? (
              <div className="order-notice order-notice-alert">
                <p>Cancel this booking? This can&apos;t be undone.</p>
                <div className="button-row">
                  <button className="button" type="button" onClick={cancel} disabled={cancelling}>{cancelling ? "Cancelling…" : "Yes, cancel it"}</button>
                  <button className="button button-secondary" type="button" onClick={() => setConfirmCancel(false)}>Keep it</button>
                </div>
              </div>
            ) : (
              <button className="text-button" type="button" onClick={() => setConfirmCancel(true)}>Cancel this booking</button>
            )
          ) : booking.status !== "cancelled" ? (
            <p className="checkout-note">This booking can no longer be changed online.</p>
          ) : null}

          <p className="checkout-note">Rather talk it through? <a href={venue.telHref}>Call {venue.phone}</a>.</p>
        </>
      ) : null}
    </section>
  );
}
