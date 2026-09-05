import type { Metadata } from "next";
import { EnquiryForm } from "../components/EnquiryForm";
import { MotionRail } from "../components/MotionRail";
import { BUSINESS, HOURS } from "../lib/site-data";

export const metadata: Metadata = {
  title: "Enquire",
  description: "Prepare a clear large-order, event or dietary enquiry for Beach Road Pizza in Christies Beach.",
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
              For large orders, group nights and dietary questions, organise the details here before you call.
            </p>
          </div>
          <div className="page-art page-art-enquire">
            <span className="page-art-label page-art-label-one" aria-hidden="true">Large orders</span>
            <span className="page-art-label page-art-label-two" aria-hidden="true">Local team</span>
            <span className="page-art-label page-art-label-three" aria-hidden="true">Dietary help</span>
            <img
              className="page-cutout page-cutout-enquire"
              src="/images/cutouts/enquire-chicken-cutout-v1.png"
              alt="A chicken pizza from Beach Road Pizza"
              width="1254"
              height="1254"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>
      <MotionRail
        label="Large order enquiry topics"
        tone="blue"
        items={["Group nights", "Large orders", "Dietary questions", "Birthday dinners", "Community events"]}
      />
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
