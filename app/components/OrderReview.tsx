"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, api } from "../lib/api";
import { orderReference } from "../lib/venue";
import { useVenue } from "./providers/VenueProvider";

/*
 * /review/[token], opened from the "How was your order?" email or text. The
 * token is the only credential (CentralPass backend routes/reviews.js).
 *
 *   5 stars    saved, then straight to the venue's Google review page.
 *   1-4 stars  a short private form that goes to the shop, not to Google.
 *
 * ?rating=N is the star tapped in the email, sent once the page loads.
 * ?stop=1 is the "Stop review requests" link.
 */

const EXAMPLE_TOKEN = "example";
const STAR_WORDS = ["", "Poor", "Not great", "Okay", "Good", "Excellent"];

type Issue = { key: string; label: string };
type ReviewView = {
  example?: boolean;
  venue: { name: string; phone: string };
  order: { number: number; type: string; items: string[] };
  state: "open" | "google" | "done" | "expired";
  rating: number | null;
  issues: Issue[];
  contact: { name: string; email: string; phone: string };
  google: boolean;
  google_url?: string | null;
};
type RatingResult = { next: "google" | "feedback" | "thanks"; url?: string };
type Step = "loading" | "error" | "open" | "feedback" | "google" | "thanks" | "sent" | "done" | "expired" | "stop" | "stopped";

function Stars({ value, onChoose, disabled }: { value: number; onChoose: (n: number) => void; disabled?: boolean }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="review-stars" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}, ${STAR_WORDS[n].toLowerCase()}`}
          className={n <= shown ? "is-on" : ""}
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(0)}
          onClick={() => onChoose(n)}
        >★</button>
      ))}
      <span className="review-star-word" aria-hidden="true">{STAR_WORDS[shown] || " "}</span>
    </div>
  );
}

export function OrderReview({ token }: { token: string }) {
  const venue = useVenue();
  const isExample = token === EXAMPLE_TOKEN;
  const [review, setReview] = useState<ReviewView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [rating, setRating] = useState(0);
  const [issues, setIssues] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [contactOk, setContactOk] = useState(false);
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [googleUrl, setGoogleUrl] = useState<string | null>(null);
  const started = useRef(false);
  const path = `/api/reviews/${encodeURIComponent(token)}`;
  const shopName = review?.venue?.name || venue.name;

  const closedBy = (err: unknown) => {
    if (err instanceof ApiError && err.status === 409) { setStep("done"); return true; }
    if (err instanceof ApiError && err.status === 410) { setStep("expired"); return true; }
    return false;
  };

  const choose = async (n: number) => {
    setRating(n);
    setFormError(null);
    setBusy(true);
    try {
      const result = await api.post<RatingResult>(`${path}/rating`, { rating: n });
      if (result.next === "google") {
        setGoogleUrl(result.url || null);
        setStep("google");
        // Straight there, so the customer only writes the review once.
        if (!isExample && result.url) window.location.assign(result.url);
      } else if (result.next === "thanks") {
        setStep("thanks");
      } else {
        setStep("feedback");
      }
    } catch (err) {
      if (!closedBy(err)) setFormError((err as Error).message || "We couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const query = new URLSearchParams(window.location.search);
    const wantsStop = query.get("stop") === "1";
    const tapped = Number(query.get("rating"));
    api.get<ReviewView>(path)
      .then((data) => {
        setReview(data);
        setContact({ name: data.contact?.name || "", phone: data.contact?.phone || "", email: data.contact?.email || "" });
        if (data.rating) setRating(data.rating);
        if (wantsStop) { setStep("stop"); return; }
        if (data.state === "google") { setGoogleUrl(data.google_url || null); setStep("google"); return; }
        if (data.state !== "open") { setStep(data.state); return; }
        if (tapped >= 1 && tapped <= 5) {
          // Used once: a refresh shows the page, not a second answer.
          query.delete("rating");
          const rest = query.toString();
          window.history.replaceState(window.history.state, "", `${window.location.pathname}${rest ? `?${rest}` : ""}`);
          void choose(tapped);
          return;
        }
        setStep(data.rating && data.rating < 5 ? "feedback" : "open");
      })
      .catch((err) => {
        const status = err instanceof ApiError ? err.status : 0;
        setError(status === 404
          ? "This review link isn't valid. It may have been copied incompletely."
          : status === 402 ? "Reviews aren't available right now." : "We couldn't open this page right now. Please try again shortly.");
        setStep("error");
      });
  // Runs once on arrival.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const toggleIssue = (key: string) => setIssues((list) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!issues.length && !comment.trim()) { setFormError("Tick what went wrong or write a few words."); return; }
    if (contactOk && !contact.phone.trim() && !contact.email.trim()) { setFormError("Add a phone number or email so the team can reach you."); return; }
    setBusy(true);
    try {
      await api.post(`${path}/feedback`, {
        rating, issues, comment: comment.trim(), contact_ok: contactOk,
        contact_name: contact.name.trim(), contact_phone: contact.phone.trim(), contact_email: contact.email.trim(),
      });
      setStep("sent");
    } catch (err) {
      if (!closedBy(err)) setFormError((err as Error).message || "We couldn't send that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      await api.post(`${path}/stop`, {});
      setStep("stopped");
    } catch (err) {
      setFormError((err as Error).message || "We couldn't do that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const heading: Record<Step, string> = {
    loading: "One sec.",
    error: "Review unavailable.",
    open: "How was your order?",
    feedback: "Sorry it wasn't perfect.",
    google: "Thank you!",
    thanks: "Thank you!",
    sent: "Thanks for telling us.",
    done: "Thanks, we've got your feedback.",
    expired: "This link has expired.",
    stop: "Stop review requests?",
    stopped: "Done.",
  };
  const order = review?.order;

  return (
    <>
      <section className="order-hero tracking-hero">
        <div className="shell" aria-live="polite">
          <p className="eyebrow">{shopName}</p>
          <h1>{heading[step]}</h1>
        </div>
      </section>

      <div className="shell review-page">
        {isExample && review ? (
          <p className="order-notice" role="note"><strong>Example page.</strong> Nothing you choose here is saved.</p>
        ) : null}

        <section className="tracking-card review-card">
          {step === "loading" ? <p role="status">Loading…</p> : null}

          {step === "error" ? (
            <>
              <p>{error}</p>
              <a className="button" href={venue.telHref}>Call {venue.phone}</a>
            </>
          ) : null}

          {order && (step === "open" || step === "feedback") ? (
            <p className="review-order">
              Order {orderReference(order.number)}{order.items?.length ? `: ${order.items.join(", ")}` : ""}
            </p>
          ) : null}

          {step === "open" ? (
            <>
              <p className="review-lead">Tap a star. It takes a few seconds.</p>
              <Stars value={rating} onChoose={(n) => void choose(n)} disabled={busy} />
              {formError ? <p className="field-error" role="alert">{formError}</p> : null}
            </>
          ) : null}

          {step === "feedback" ? (
            <form className="review-form" onSubmit={submit} noValidate>
              <Stars value={rating} onChoose={(n) => (n === 5 ? void choose(5) : setRating(n))} disabled={busy} />
              <p className="review-lead">Thanks for being honest. This goes straight to the team, not online.</p>

              <fieldset className="review-issues">
                <legend>What could have been better?</legend>
                <div>
                  {(review?.issues || []).map((issue) => (
                    <label key={issue.key} className={issues.includes(issue.key) ? "is-on" : ""}>
                      <input type="checkbox" checked={issues.includes(issue.key)} onChange={() => toggleIssue(issue.key)} />
                      {issue.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="review-field">
                Tell us more (optional)
                <textarea rows={4} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)}
                  placeholder="What happened, and what would have made it right?" />
              </label>

              <label className="check-control">
                <input type="checkbox" checked={contactOk} onChange={(e) => setContactOk(e.target.checked)} />
                I&apos;m happy for the team to contact me about this
              </label>
              {contactOk ? (
                <div className="review-contact">
                  <label className="review-field">Name
                    <input autoComplete="name" value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} /></label>
                  <label className="review-field">Phone
                    <input type="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} /></label>
                  <label className="review-field">Email
                    <input type="email" autoComplete="email" value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} /></label>
                </div>
              ) : null}

              {formError ? <p className="field-error" role="alert">{formError}</p> : null}
              <button type="submit" className="button" disabled={busy}>{busy ? "Sending…" : "Send to the team"}</button>
            </form>
          ) : null}

          {step === "google" ? (
            <>
              <p className="review-lead">Stoked you enjoyed it. Taking you to Google so you can say so there.</p>
              {googleUrl ? <a className="button" href={googleUrl}>Write a Google review</a> : null}
              {isExample ? <p className="form-note">On a real link this opens your Google review page straight away.</p> : null}
            </>
          ) : null}

          {step === "thanks" ? <p className="review-lead">Stoked you enjoyed it. See you next time!</p> : null}
          {step === "sent" ? (
            <p className="review-lead">
              {contactOk ? "The team reads every message and will be in touch soon." : "The team reads every message and will use it to do better."}
            </p>
          ) : null}
          {step === "done" ? <p className="review-lead">Thanks again for letting us know how your order went.</p> : null}
          {step === "expired" ? (
            <>
              <p className="review-lead">Review links last 14 days. If something was wrong with your order, give us a call.</p>
              <a className="button" href={venue.telHref}>Call {venue.phone}</a>
            </>
          ) : null}
          {step === "stop" ? (
            <>
              <p className="review-lead">We won&apos;t ask you to rate your orders again. Your orders and receipts aren&apos;t affected.</p>
              {formError ? <p className="field-error" role="alert">{formError}</p> : null}
              <button type="button" className="button" onClick={() => void stop()} disabled={busy}>{busy ? "Saving…" : "Stop review requests"}</button>
            </>
          ) : null}
          {step === "stopped" ? <p className="review-lead">You won&apos;t get any more review requests from {shopName}.</p> : null}
        </section>

        <p className="checkout-note"><Link href="/">Head back home</Link></p>
      </div>
    </>
  );
}
