"use client";

import { useState, type FormEvent } from "react";
import { ApiError, api } from "../lib/api";

/**
 * Mailing list sign-up (POST /api/subscriptions). Consent is explicit and
 * unticked. The hidden "website" field is a honeypot for form bots.
 */
export function SubscribeForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!consent || status === "sending") return;
    setStatus("sending");
    setMessage("");
    try {
      await api.post("/api/subscriptions", { name: name.trim(), email: email.trim(), consent, website });
      setStatus("done");
      setMessage("You're on the list. Keep an eye out for the next deal.");
      setName("");
      setEmail("");
      setConsent(false);
    } catch (caught) {
      setStatus("error");
      setMessage((caught as ApiError).message || "We couldn't add you just now. Please try again.");
    }
  }

  return (
    <form className="subscribe-form" onSubmit={submit}>
      <div className="order-form-grid">
        <label><span>First name <span className="field-optional">(optional)</span></span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="given-name" maxLength={100} /></label>
        <label>Email<input required type="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
      </div>
      <label className="honeypot" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </label>
      <label className="check-control consent-control">
        <input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>Yes, email me Beach Road Pizza deals and news. I can unsubscribe at any time.</span>
      </label>
      <button className="button" type="submit" disabled={!consent || status === "sending"}>
        {status === "sending" ? "Signing you up…" : "Join the list"}
      </button>
      {message ? <p className={status === "error" ? "field-error" : "field-success"} role={status === "error" ? "alert" : "status"}>{message}</p> : null}
    </form>
  );
}
