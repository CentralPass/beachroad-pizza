import type { Metadata } from "next";
import { BUSINESS } from "../lib/site-data";

export const metadata: Metadata = {
  title: "Catering",
  description:
    "Plan easy local catering with Beach Road Pizza for office lunches, club nights, birthdays and family events in southern Adelaide.",
};

const occasions = [
  {
    title: "Work and team lunches",
    text: "A clear mix of crowd favourites, vegan choices and easy-to-share sides for the office table.",
  },
  {
    title: "Birthdays and family events",
    text: "Familiar flavours for kids, generous gourmet options for adults and flexible sizes for mixed groups.",
  },
  {
    title: "Clubs, schools and community nights",
    text: "Large pizza orders planned around your collection time, group size and practical budget.",
  },
  {
    title: "Relaxed celebrations",
    text: "Build a spread with pizza, pasta, schnitzels, wings, bread and sides without formal catering fuss.",
  },
];

export default function CateringPage() {
  return (
    <>
      <section className="inner-hero catering-hero">
        <div className="shell catering-hero-grid">
          <div>
            <p className="eyebrow">Catering made local</p>
            <h1>Good food for the whole room.</h1>
            <p>
              Tell us the headcount, timing and dietary needs. We will help you shape a practical order with plenty to go around.
            </p>
            <div className="button-row">
              <a className="button" href="/enquire?type=catering">
                Start a catering enquiry
              </a>
              <a className="button button-secondary" href={BUSINESS.phoneHref}>
                Call {BUSINESS.phoneDisplay}
              </a>
            </div>
          </div>
          <img
            src="/images/illustrations/menu-catering.jpg"
            alt="Illustrated catering spread with schnitzel, pasta and pizza boxes"
            width="2000"
            height="1000"
            fetchPriority="high"
          />
        </div>
      </section>

      <section className="occasion-section">
        <div className="shell occasion-layout">
          <div className="section-heading sticky-heading">
            <p className="eyebrow">Built around your event</p>
            <h2>From a dozen people to a busy community room.</h2>
            <p>Every event is quoted around the menu, group and collection plan. No invented packages and no surprise minimum hidden on this page.</p>
          </div>
          <div className="occasion-list">
            {occasions.map((occasion) => (
              <article key={occasion.title}>
                <h3>{occasion.title}</h3>
                <p>{occasion.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="catering-steps">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">How to get started</p>
            <h2>Four details make the quote useful.</h2>
          </div>
          <ol>
            <li>
              <span>01</span>
              <div>
                <h3>Date and collection time</h3>
                <p>Share the timing early so the kitchen can advise what is realistic.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Approximate headcount</h3>
                <p>An honest estimate helps balance variety, portions and budget.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Food direction</h3>
                <p>Choose pizza-only or add pasta, schnitzels, bread, wings and sides.</p>
              </div>
            </li>
            <li>
              <span>04</span>
              <div>
                <h3>Dietary needs</h3>
                <p>Flag vegan and gluten-free requests so the team can explain the available options.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="catering-cta">
        <div className="shell">
          <p className="eyebrow">Ready when you are</p>
          <h2>Bring the headcount. We will help with the food.</h2>
          <a className="button" href="/enquire?type=catering">
            Prepare an enquiry
          </a>
        </div>
      </section>
    </>
  );
}
