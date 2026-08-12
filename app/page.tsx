import type { Metadata } from "next";
import { ReviewRail } from "./components/ReviewRail";
import { StoreStatus } from "./components/StoreStatus";
import { BUSINESS, DEALS, HOURS } from "./lib/site-data";

export const metadata: Metadata = {
  title: "Pizza, pasta and local value in Christies Beach",
  description:
    "See Beach Road Pizza's current deals, local favourites, opening hours, catering and award-winning Christies Beach story.",
};

export default function Home() {
  return (
    <>
      <section className="home-hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Christies Beach local</p>
            <h1>Great pizzas, great prices, for a great community.</h1>
            <p className="hero-lead">
              Big flavour, generous toppings and plenty of choice, made for family nights, beach sunsets and everyone at the table.
            </p>
            <div className="button-row">
              <a className="button" href={BUSINESS.orderUrl} target="_blank" rel="noreferrer">
                Order online
              </a>
              <a className="button button-secondary" href="/menu">
                Explore the menu
              </a>
            </div>
            <div className="hero-facts">
              <StoreStatus />
              <a href={BUSINESS.mapsUrl} target="_blank" rel="noreferrer">
                29B Beach Road, Christies Beach
              </a>
            </div>
          </div>
          <figure className="hero-image-wrap">
            <img
              src="/images/food/Header_Beach Road Pizza.jpg"
              alt="A generous Beach Road Pizza spread with pizzas, wings, chips and wedges"
              width="1600"
              height="900"
              fetchPriority="high"
            />
            <figcaption>Made for sharing. Better by the beach.</figcaption>
          </figure>
        </div>
      </section>

      <section className="deal-section" id="deals" aria-labelledby="deal-title">
        <div className="shell deal-layout">
          <div className="section-heading section-heading-light">
            <p className="eyebrow">Current platform offers</p>
            <h2 id="deal-title">Good value, clearly explained.</h2>
            <p>These offers were listed online at the time of research. Open the platform to confirm live availability before ordering.</p>
          </div>
          <div className="deal-list">
            {DEALS.map((deal) => (
              <article key={deal.title}>
                <h3>{deal.title}</h3>
                <p>{deal.detail}</p>
                <small>{deal.note}</small>
                <a href={deal.href} target="_blank" rel="noreferrer">
                  {deal.action}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="favourites-section" aria-labelledby="favourites-title">
        <div className="shell">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">Start here</p>
              <h2 id="favourites-title">The favourites locals keep coming back for.</h2>
            </div>
            <p>
              Traditional, gourmet, vegan and family-size pizzas sit alongside pasta, schnitzels, wings and loaded sides.
            </p>
          </div>
          <div className="favourite-grid">
            <a className="favourite-feature" href="/menu">
              <img
                src="/images/food/Beach Road Pizza_Lamb Yiros.jpg"
                alt="Lamb yiros pizza"
                width="1000"
                height="560"
                loading="lazy"
              />
              <span>
                <strong>Lamb Yiros</strong>
                <small>Garlic sauce, tomato and herbs</small>
              </span>
            </a>
            <a href="/menu" className="favourite-small">
              <img
                src="/images/food/Beach Road Pizza_Satay Chicken.jpg"
                alt="Satay chicken pizza"
                width="760"
                height="520"
                loading="lazy"
              />
              <span>
                <strong>Satay Chicken</strong>
                <small>Gourmet favourite</small>
              </span>
            </a>
            <a href="/menu" className="favourite-small">
              <img
                src="/images/food/Beach Road Pizza_Bacon & Wedges.jpg"
                alt="Loaded bacon and cheese wedges"
                width="760"
                height="520"
                loading="lazy"
              />
              <span>
                <strong>Loaded Wedges</strong>
                <small>Made for the middle of the table</small>
              </span>
            </a>
          </div>
          <div className="section-action">
            <a className="text-link" href="/menu">
              Search the full menu
            </a>
          </div>
        </div>
      </section>

      <ReviewRail />

      <section className="catering-preview">
        <div className="shell catering-preview-grid">
          <div className="catering-copy">
            <p className="eyebrow">Catering from your local</p>
            <h2>Feed the room without overcomplicating the plan.</h2>
            <p>
              Pizza, pasta, schnitzels and sides can be shaped around office lunches, club nights, birthdays and relaxed family events.
            </p>
            <a className="button" href="/catering">
              Plan catering
            </a>
          </div>
          <img
            src="/images/illustrations/menu-catering.jpg"
            alt="Editorial illustration of schnitzel, pasta and pizza catering"
            width="2000"
            height="1000"
            loading="lazy"
          />
        </div>
      </section>

      <section className="visit-section" aria-labelledby="visit-title">
        <div className="shell visit-grid">
          <div>
            <p className="eyebrow">Tonight on Beach Road</p>
            <h2 id="visit-title">Order, collect, then find a sunset.</h2>
            <p>{BUSINESS.address}</p>
            <div className="button-row">
              <a className="button" href={BUSINESS.mapsUrl} target="_blank" rel="noreferrer">
                Get directions
              </a>
              <a className="button button-secondary" href={BUSINESS.phoneHref}>
                Call {BUSINESS.phoneDisplay}
              </a>
            </div>
          </div>
          <div className="hours-list">
            {HOURS.map((row) => (
              <div key={row.days}>
                <span>{row.days}</span>
                <strong>{row.hours}</strong>
              </div>
            ))}
            <small>Hours can change on public holidays. Call to confirm.</small>
          </div>
        </div>
      </section>
    </>
  );
}
