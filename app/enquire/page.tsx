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
      <section className="faq-section" aria-labelledby="faq-title">
        <div className="shell faq-layout">
          <div className="faq-heading">
            <p className="eyebrow">Good to know</p>
            <h2 id="faq-title">Frequently asked questions.</h2>
            <p>Quick answers before you call or place an order.</p>
          </div>
          <div className="faq-list">
            <details>
              <summary>Do you have gluten-free pizza bases?</summary>
              <p>Yes. Gluten-free bases are available in large size for an extra $5. The kitchen handles gluten, so please call the shop before ordering if you have coeliac disease or a serious allergy.</p>
            </details>
            <details>
              <summary>Are there vegan options?</summary>
              <p>Yes. The menu includes vegan pizzas, vegan garlic bread and vegan nuggets. For allergies or specific preparation questions, check with the team before ordering.</p>
            </details>
            <details>
              <summary>Can I order pickup or delivery?</summary>
              <p>Both are available. Pickup is from 29B Beach Road, Christies Beach. Delivery starts from $8, with the final fee and delivery area confirmed before payment.</p>
            </details>
            <details>
              <summary>Can I organise a large group order?</summary>
              <p>Absolutely. Call as early as possible with your date, preferred time, guest count and dietary needs—especially for Friday and Saturday nights.</p>
            </details>
            <details>
              <summary>What time do you open?</summary>
              <p>Beach Road Pizza opens from 3 pm, seven days a week. Public holiday hours can change, so call the shop to confirm on those dates.</p>
            </details>
            <details>
              <summary>Can I customise a pizza?</summary>
              <p>Many pizzas can be adjusted. Extras, substitutions and half-and-half selections may change the total, which will be confirmed before payment.</p>
            </details>
          </div>
        </div>
      </section>
    </>
  );
}
