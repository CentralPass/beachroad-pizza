import type { Metadata } from "next";
import { EnquiryForm } from "../components/EnquiryForm";
import { BUSINESS, HOURS } from "../lib/site-data";

export const metadata: Metadata = {
  title: "Enquire",
  description: "Prepare a clear catering, large order or dietary enquiry for Beach Road Pizza in Christies Beach.",
};

export default function EnquirePage() {
  return (
    <>
      <section className="enquiry-hero">
        <div className="shell enquiry-hero-grid">
          <div>
            <p className="eyebrow">Talk to the team</p>
            <h1>Tell us what you are planning.</h1>
            <p>
              For catering, large orders and dietary questions, organise the details here before you call.
            </p>
          </div>
          <img
            className="page-illustration float-food"
            src="/images/illustrations/enquiry-phone-v2.png"
            alt="Simple painted telephone, order notepad and pencil"
            width="1000"
            height="1000"
            fetchPriority="high"
          />
        </div>
      </section>
      <section className="enquiry-section">
        <div className="shell enquiry-layout">
          <div className="contact-panel">
            <p className="eyebrow">Contact</p>
            <h2>Beach Road Pizza</h2>
            <a className="contact-phone" href={BUSINESS.phoneHref}>
              {BUSINESS.phoneDisplay}
            </a>
            <address>{BUSINESS.address}</address>
            <a href={BUSINESS.mapsUrl} target="_blank" rel="noreferrer">
              Get directions
            </a>
            <div className="contact-hours">
              {HOURS.map((row) => (
                <p key={row.days}>
                  <span>{row.days}</span>
                  {row.hours}
                </p>
              ))}
            </div>
          </div>
          <EnquiryForm />
        </div>
      </section>
    </>
  );
}
