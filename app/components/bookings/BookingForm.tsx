"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ApiError, api, newRequestId } from "../../lib/api";
import { formatClock, formatMoney } from "../../lib/format";
import { addDays, dayLabel, venueDate } from "../../lib/hours";
import type { Booking, BookingAvailability, BookingConfig } from "../../lib/types";
import { useBookingConfig } from "../../lib/useBookingConfig";
import { useVenue } from "../providers/VenueProvider";

export function BookingPanel() {
  const venue = useVenue();
  const { config, loaded, online } = useBookingConfig();

  if (!loaded) return <div className="empty-state" role="status"><h3>Checking table availability…</h3></div>;
  if (!online || !config) {
    return (
      <div className="booking-offline">
        <h2>Give us a call to book.</h2>
        <p>Online table bookings aren&apos;t available right now. Call the shop and the team will look after you.</p>
        <div className="button-row">
          <a className="button" href={venue.telHref}>Call {venue.phone}</a>
          <a className="button button-secondary" href="/order">Order pickup instead</a>
        </div>
      </div>
    );
  }
  return <BookingForm config={config} />;
}

function depositFor(config: BookingConfig, party: number) {
  const rules = config.deposits;
  if (!rules?.deposit_enabled || party < rules.deposit_min_party) return null;
  const cents = rules.deposit_amount_cents * (rules.deposit_basis === "per_person" ? party : 1);
  return { cents, rules };
}

function BookingForm({ config }: { config: BookingConfig }) {
  const venue = useVenue();
  const maxParty = config.max_party_size || 12;
  const horizon = Math.min(Math.max(config.max_days_ahead || 30, 1), 60);
  const today = useMemo(() => venueDate(), []);
  const dates = useMemo(() => Array.from({ length: horizon }, (_, index) => addDays(today, index)), [today, horizon]);

  const [party, setParty] = useState(2);
  const [date, setDate] = useState(today);
  const [availability, setAvailability] = useState<BookingAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [time, setTime] = useState<string | null>(null);
  const [details, setDetails] = useState({ name: "", phone: "", email: "", notes: "" });
  const [acceptDeposit, setAcceptDeposit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  // One idempotency key per attempt, reused on retry so a flaky connection
  // can never book the same table twice.
  const requestId = useRef(newRequestId());

  const tooLarge = party > maxParty;
  const deposit = depositFor(config, party);

  const loadSlots = useCallback(async (forDate: string, forParty: number) => {
    setLoadingSlots(true);
    setTime(null);
    try {
      setAvailability(await api.get<BookingAvailability>(`/api/bookings/availability?date=${forDate}&party_size=${forParty}`));
    } catch {
      setAvailability({ date: forDate, open: false, reason: "We couldn't check availability. Please try again or call us.", slots: [] });
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (tooLarge) return;
    const timer = window.setTimeout(() => void loadSlots(date, party), 0);
    return () => window.clearTimeout(timer);
  }, [date, party, tooLarge, loadSlots]);

  useEffect(() => {
    requestId.current = newRequestId();
  }, [date, time, party]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!time || submitting) return;
    if (deposit && !acceptDeposit) {
      setError("Please accept the deposit terms to continue.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const booking = await api.post<Booking>("/api/bookings", {
        date,
        time,
        party_size: party,
        name: details.name.trim(),
        phone: details.phone.trim(),
        email: details.email.trim() || undefined,
        notes: details.notes.trim() || undefined,
        request_id: requestId.current,
        ...(deposit ? { accept_deposit_policy: true, deposit_policy_version: deposit.rules.deposit_version } : {}),
      });
      setConfirmed(booking);
    } catch (caught) {
      const failure = caught as ApiError;
      setError(failure.message || "Something went wrong. Please try again.");
      // Someone may have taken the last table since the times loaded.
      if (failure.status === 409) void loadSlots(date, party);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    const manageHref = confirmed.manage_url || (confirmed.manage_token ? `/bookings/manage/${confirmed.manage_token}` : null);
    const depositDue = confirmed.deposit && confirmed.deposit.status === "due";
    return (
      <div className="booking-done" role="status">
        <p className="eyebrow">{confirmed.status === "pending" ? "Request received" : "Booking confirmed"}</p>
        <h2>{confirmed.status === "pending" ? `Thanks, ${confirmed.name.split(" ")[0]}. We've got your request.` : `See you soon, ${confirmed.name.split(" ")[0]}.`}</h2>
        <dl className="receipt-meta">
          <div><dt>When</dt><dd>{dayLabel(date)} at {formatClock(time)}</dd></div>
          <div><dt>Guests</dt><dd>{confirmed.party_size}</dd></div>
          <div><dt>Reference</dt><dd>{confirmed.reference}</dd></div>
        </dl>
        {depositDue ? (
          <p className="order-notice"><strong>Your deposit is due.</strong> Pay it to hold the table; unpaid bookings are released when the payment deadline passes.</p>
        ) : (
          <p>{confirmed.status === "pending" ? "We'll confirm it shortly." : "A confirmation is on its way to you."}</p>
        )}
        {manageHref ? (
          <a className="button" href={manageHref}>{depositDue ? "Pay deposit and manage booking" : "Manage your booking"}</a>
        ) : null}
      </div>
    );
  }

  return (
    <form className="booking-form" onSubmit={submit}>
      <fieldset>
        <legend>How many people?</legend>
        <div className="chip-row">
          {Array.from({ length: maxParty }, (_, index) => index + 1).map((size) => (
            <button key={size} type="button" className={party === size ? "is-active" : ""} aria-pressed={party === size} onClick={() => setParty(size)}>{size}</button>
          ))}
          <button type="button" className={tooLarge ? "is-active" : ""} aria-pressed={tooLarge} onClick={() => setParty(maxParty + 1)}>{maxParty}+</button>
        </div>
      </fieldset>

      {tooLarge ? (
        <div className="booking-offline">
          <p>For more than {maxParty} people, please call us so we can set you up properly.</p>
          <a className="button" href={venue.telHref}>Call {venue.phone}</a>
        </div>
      ) : (
        <>
          <fieldset>
            <legend>Which day?</legend>
            <div className="chip-row chip-row-scroll">
              {dates.map((value) => (
                <button key={value} type="button" className={date === value ? "is-active" : ""} aria-pressed={date === value} onClick={() => setDate(value)}>
                  {value === today ? "Today" : dayLabel(value)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>What time?</legend>
            {loadingSlots ? (
              <p className="field-help" role="status">Checking availability…</p>
            ) : availability && !availability.open ? (
              <p className="field-help">{availability.reason || "We're closed that day."}</p>
            ) : availability?.slots.length ? (
              <div className="chip-row">
                {availability.slots.map((slot) => {
                  const fits = slot.available && slot.seats_left >= party;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!fits}
                      title={!slot.available ? slot.reason || undefined : !fits ? "Not enough seats left" : undefined}
                      className={time === slot.time ? "is-active" : ""}
                      aria-pressed={time === slot.time}
                      onClick={() => setTime(slot.time)}
                    >
                      {formatClock(slot.time)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="field-help">No times left that day. Try another day or give us a call.</p>
            )}
          </fieldset>

          {time ? (
            <fieldset>
              <legend>Your details</legend>
              <div className="order-form-grid">
                <label>Name<input required value={details.name} autoComplete="name" onChange={(event) => setDetails((current) => ({ ...current, name: event.target.value }))} /></label>
                <label>Phone<input required type="tel" inputMode="tel" autoComplete="tel" value={details.phone} onChange={(event) => setDetails((current) => ({ ...current, phone: event.target.value }))} /></label>
                <label className="full-field"><span>Email <span className="field-optional">(for your confirmation)</span></span><input type="email" autoComplete="email" value={details.email} onChange={(event) => setDetails((current) => ({ ...current, email: event.target.value }))} /></label>
                <label className="full-field">Anything we should know?<textarea rows={2} maxLength={500} value={details.notes} placeholder="High chair, birthday, accessibility" onChange={(event) => setDetails((current) => ({ ...current, notes: event.target.value }))} /></label>
              </div>
              {deposit ? (
                <label className="check-control consent-control">
                  <input type="checkbox" checked={acceptDeposit} onChange={(event) => setAcceptDeposit(event.target.checked)} />
                  <span>
                    A deposit of {formatMoney(deposit.cents / 100)} is required for this booking and is credited to your bill.
                    Cancel at least {deposit.rules.deposit_refund_hours} hours before for a full refund; after that it&apos;s kept.
                    Unpaid bookings are released after {deposit.rules.deposit_hold_minutes} minutes.
                  </span>
                </label>
              ) : null}
              {error ? <p className="order-notice order-notice-alert" role="alert">{error}</p> : null}
              <button className="button" type="submit" disabled={submitting}>
                {submitting ? "Booking…" : `Book for ${party} at ${formatClock(time)}`}
              </button>
            </fieldset>
          ) : null}
        </>
      )}
    </form>
  );
}
