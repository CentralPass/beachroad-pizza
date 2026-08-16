import type { Metadata } from "next";
import { ReviewRail } from "./components/ReviewRail";
import { StoreStatus } from "./components/StoreStatus";
import { BUSINESS, DEALS, HOURS } from "./lib/site-data";

export const metadata: Metadata = {
  title: "Pizza, pasta and local value in Christies Beach",
  description:
    "See Beach Road Pizza's current deals, local favourites, opening hours, catering and award-winning Christies Beach story.",
};

const favourites = [
  {
    title: "Lamb Yiros",
    detail: "Garlic sauce, tomato and herbs",
    image: "/images/food/Beach Road Pizza_Lamb Yiros.jpg",
  },
  {
    title: "Satay Chicken",
    detail: "A local gourmet favourite",
    image: "/images/food/Beach Road Pizza_Satay Chicken.jpg",
  },
  {
    title: "Loaded Wedges",
    detail: "Bacon, cheese and sour cream",
    image: "/images/food/Beach Road Pizza_Bacon & Wedges.jpg",
  },
];

export default function Home() {
  return (
    <>
      <section className="home-hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Your Christies Beach local</p>
            <h1>Great pizzas, great prices, for a great community.</h1>
            <p className="hero-lead">
              Generous toppings, family-friendly value and plenty of choice for nights by the beach.
            </p>
            <div className="button-row">
              <a className="button" href={BUSINESS.orderUrl} target="_blank" rel="noreferrer">
                Order online
              </a>
              <a className="button button-secondary" href="/menu">
                View menu
              </a>
            </div>
            <div className="hero-facts">
              <StoreStatus />
              <a href={BUSINESS.mapsUrl} target="_blank" rel="noreferrer">
                29B Beach Road
              </a>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <img
              className="spin-food"
              src="/images/food/Beach Road Pizza_Peri Peri Chicken.jpg"
              alt=""
              width="1600"
              height="900"
              fetchPriority="high"
            />
            <p>Peri Peri Chicken</p>
          </div>
        </div>
      </section>

      <div className="motion-ticker" aria-label="Beach Road Pizza motto">
        <div className="motion-ticker-track">
          <div className="motion-ticker-group">
            <span>Great pizzas · Great prices · Great community ·</span>
            <span>Great pizzas · Great prices · Great community ·</span>
            <span>Great pizzas · Great prices · Great community ·</span>
          </div>
          <div className="motion-ticker-group" aria-hidden="true">
            <span>Great pizzas · Great prices · Great community ·</span>
            <span>Great pizzas · Great prices · Great community ·</span>
            <span>Great pizzas · Great prices · Great community ·</span>
          </div>
        </div>
      </div>

      <section className="photo-banner shell" aria-label="Beach Road Pizza favourites">
        <img
          src="/images/food/Header_Beach Road Pizza.jpg"
          alt="A Beach Road Pizza spread with pizzas, wings, chips and wedges"
          width="1600"
          height="900"
          loading="eager"
        />
        <p>Made for sharing. Better by the beach.</p>
      </section>

      <section className="video-feature video-feature-blue" aria-labelledby="cheese-pull-title">
        <div className="shell video-feature-grid">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/videos/pizza-cheese-pull-poster-v1.png"
            aria-label="A slice being lifted from a freshly baked pizza"
          >
            <source src="/videos/pizza-cheese-pull-v1.mp4" type="video/mp4" />
          </video>
          <div>
            <p className="eyebrow">Fresh from the oven</p>
            <h2 id="cheese-pull-title">A proper cheese pull.</h2>
            <p>Hot, generous and ready for the table—exactly how a local pizza night should feel.</p>
          </div>
        </div>
      </section>

      <section className="deal-section" id="deals" aria-labelledby="deal-title">
        <div className="shell compact-section-head">
          <div>
            <p className="eyebrow">Straight from the menu</p>
            <h2 id="deal-title">Big-night deals.</h2>
          </div>
          <p>Pizza, bread and drinks bundled for easy family and group orders.</p>
        </div>
        <div className="shell deal-feature">
          <img src="/images/illustrations/deals-garlic-bread-v3.png" alt="Hand-drawn garlic bread, drink and closed pizza box" width="1456" height="1092" loading="lazy" />
          <p>Delivery starts from $8. Confirm final availability and pricing when ordering.</p>
        </div>
        <div className="shell deal-list">
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
      </section>

      <section className="favourites-section" aria-labelledby="favourites-title">
        <div className="shell compact-section-head">
          <div>
            <p className="eyebrow">Local favourites</p>
            <h2 id="favourites-title">Pick your tonight.</h2>
          </div>
          <a className="text-link" href="/menu">See the full menu</a>
        </div>
        <div className="shell favourite-grid">
          {favourites.map((item) => (
            <a href="/menu" className="favourite-card" key={item.title}>
              <img src={item.image} alt={`${item.title} from Beach Road Pizza`} width="760" height="520" loading="lazy" />
              <span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </span>
            </a>
          ))}
        </div>
      </section>

      <ReviewRail />

      <section className="catering-preview">
        <div className="shell catering-preview-grid">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/videos/pasta-over-flame-poster-v1.png"
            aria-label="Pasta being tossed in a pan over a flame"
          >
            <source src="/videos/pasta-over-flame-v1.mp4" type="video/mp4" />
          </video>
          <div className="catering-copy">
            <p className="eyebrow">Catering from your local</p>
            <h2>Good food for the whole room.</h2>
            <p>Pizza, pasta, schnitzels and sides for offices, clubs, birthdays and family events.</p>
            <a className="button" href="/catering">Plan catering</a>
          </div>
        </div>
      </section>

      <section className="visit-section" aria-labelledby="visit-title">
        <div className="shell visit-grid">
          <img className="visit-illustration" src="/images/illustrations/beach-pickup-v3.png" alt="Hand-drawn takeaway pizza box held beside the Christies Beach sunset" width="1456" height="1092" loading="lazy" />
          <div>
            <p className="eyebrow">Tonight on Beach Road</p>
            <h2 id="visit-title">Order, collect, find a sunset.</h2>
            <p>{BUSINESS.address}</p>
            <div className="button-row">
              <a className="button" href={BUSINESS.mapsUrl} target="_blank" rel="noreferrer">Directions</a>
              <a className="button button-secondary" href={BUSINESS.phoneHref}>Call the shop</a>
            </div>
          </div>
          <div className="hours-list">
            {HOURS.map((row) => (
              <div key={row.days}><span>{row.days}</span><strong>{row.hours}</strong></div>
            ))}
            <small>Public holiday hours can change. Call to confirm.</small>
          </div>
        </div>
      </section>
    </>
  );
}
