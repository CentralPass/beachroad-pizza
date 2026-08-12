"use client";

import { useState } from "react";
import { BUSINESS } from "../lib/site-data";

type FormState = {
  name: string;
  phone: string;
  type: string;
  date: string;
  guests: string;
  details: string;
};

const initialState: FormState = {
  name: "",
  phone: "",
  type: "Catering",
  date: "",
  guests: "",
  details: "",
};

export function EnquiryForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [prepared, setPrepared] = useState(false);
  const [copied, setCopied] = useState(false);

  const summary = [
    `Beach Road Pizza enquiry from ${form.name}`,
    `Phone: ${form.phone}`,
    `Enquiry: ${form.type}`,
    form.date ? `Date: ${form.date}` : "",
    form.guests ? `Guests: ${form.guests}` : "",
    `Details: ${form.details}`,
  ]
    .filter(Boolean)
    .join("\n");

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setPrepared(false);
    setCopied(false);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPrepared(true);
  }

  async function copySummary() {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
  }

  if (prepared) {
    return (
      <div className="prepared-enquiry" role="status">
        <p className="eyebrow">Your phone brief is ready</p>
        <h2>Call the shop and keep this on screen.</h2>
        <pre>{summary}</pre>
        <div className="button-row">
          <a className="button" href={BUSINESS.phoneHref}>
            Call {BUSINESS.phoneDisplay}
          </a>
          <button className="button button-secondary" type="button" onClick={copySummary}>
            {copied ? "Copied" : "Copy enquiry"}
          </button>
          <button className="text-button" type="button" onClick={() => setPrepared(false)}>
            Edit details
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="enquiry-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          Name
          <input
            required
            autoComplete="name"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
          />
        </label>
        <label>
          Phone
          <input
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
          />
        </label>
        <label>
          Enquiry type
          <select value={form.type} onChange={(event) => update("type", event.target.value)}>
            <option>Catering</option>
            <option>Large order</option>
            <option>Dietary question</option>
            <option>General question</option>
          </select>
        </label>
        <label>
          Preferred date
          <input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} />
        </label>
        <label>
          Approximate guests
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={form.guests}
            onChange={(event) => update("guests", event.target.value)}
          />
        </label>
      </div>
      <label>
        What can we help with?
        <textarea
          required
          rows={6}
          value={form.details}
          onChange={(event) => update("details", event.target.value)}
          placeholder="Tell us about timing, food, dietary needs and anything else that matters."
        />
      </label>
      <p className="form-note">
        This prepares a clear phone brief. Beach Road Pizza does not publish an enquiry email, so no personal information is sent or stored by this site.
      </p>
      <button className="button" type="submit">
        Prepare phone enquiry
      </button>
    </form>
  );
}
