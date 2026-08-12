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
              For catering, large orders and dietary questions, a quick call is the fastest path. Use the form to organise the details first.
            </p>
          </div>
          <img
            src="/images/food/Beach Road Pizza_BBQ Chicken Wings.jpg"
            alt="BBQ chicken wings from Beach Road Pizza"
            width="1200"
            height="680"
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
