import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "../components/BreadcrumbJsonLd";
import { EnquiryForm } from "../components/EnquiryForm";
import { MotionRail } from "../components/MotionRail";
import { BUSINESS } from "../lib/site-data";
import { HoursRows, VenueAddress, VenuePhoneLink } from "../components/VenueBits";

export const metadata: Metadata = {
  title: "Enquire",
  description: "Prepare a clear large-order, event or dietary enquiry for Beach Road Pizza in Christies Beach.",
};

export default function EnquirePage() {
  return (
    <>
      <BreadcrumbJsonLd name="Enquire" path="/enquire" />
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
            <img
              className="page-cutout page-cutout-enquire"
              src="/images/cutouts/enquire-lamb-yiros-cutout-v2.png"
              alt="A whole Lamb Yiros pizza from Beach Road Pizza"
              width="941"
              height="941"
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
            <VenuePhoneLink className="contact-phone" prefix="" />
            <address><VenueAddress /></address>
            <a href={BUSINESS.mapsUrl} target="_blank" rel="noreferrer">
              Get directions
            </a>
            <div className="contact-hours">
              <HoursRows variant="contact" />
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
              <p>Order pickup online and pay by card or in store when you collect from 29B Beach Road, Christies Beach. For delivery, order through Uber Eats or DoorDash.</p>
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
