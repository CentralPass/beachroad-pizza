import type { Metadata } from "next";
import { PromoModal } from "./components/PromoModal";
import { ReviewRail } from "./components/ReviewRail";
import { StoreStatus } from "./components/StoreStatus";
import { ScrollBackdrop } from "./components/ScrollBackdrop";
import { HoursRows, TodayNote, VenueAddress, VenuePhoneLink } from "./components/VenueBits";
import { formatPrice } from "./lib/format";
import { dealItems } from "./lib/menu";
import { fetchHours, fetchMenu } from "./lib/server-api";
import { BUSINESS } from "./lib/site-data";
import type { HoursResponse } from "./lib/types";
import { FALLBACK, SITE_URL, STATIC } from "./lib/venue";

// Deals and hours come from the live menu and hours; re-read every minute.
export const revalidate = 60;

const DAY_SCHEMA = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function restaurantJsonLd(hours: HoursResponse | null) {
  const openingHours = (hours?.store_hours || [])
    .filter((row) => row.is_open && row.open_time && row.close_time)
    .map((row) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_SCHEMA[row.day_of_week],
      opens: row.open_time!.slice(0, 5),
      closes: row.close_time!.slice(0, 5),
    }));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Restaurant",
        "@id": `${SITE_URL}/#restaurant`,
        name: FALLBACK.name,
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/brand/beach-road-pizza-logo-v1.png`,
        image: `${SITE_URL}/og-v3.png`,
        telephone: FALLBACK.phone,
        priceRange: "$",
        servesCuisine: ["Pizza", "Italian"],
        menu: `${SITE_URL}/menu`,
        address: {
          "@type": "PostalAddress",
          streetAddress: "29B Beach Road",
          addressLocality: STATIC.suburb,
          addressRegion: "SA",
          postalCode: "5165",
          addressCountry: "AU",
        },
        ...(openingHours.length ? { openingHoursSpecification: openingHours } : {}),
        sameAs: [STATIC.social.instagram, STATIC.social.facebook],
        potentialAction: { "@type": "OrderAction", target: `${SITE_URL}/order` },
      },
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: FALLBACK.name, inLanguage: "en-AU" },
    ],
  };
}

export const metadata: Metadata = {
  title: "Pizza, pasta and local value in Christies Beach",
  description:
    "See Beach Road Pizza's current deals, local favourites, opening hours and award-winning Christies Beach story.",
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

const movingFavourites = [
  {
    title: "Aussie",
    image: "/images/food/Beach Road Pizza_Aussie.jpg",
  },
  {
    title: "Pepperoni",
    image: "/images/food/Beach Road Pizza_Pepporini.jpg",
  },
  {
    title: "Vegetarian",
    image: "/images/food/Beach Road Pizza_Vegetarian.jpg",
  },
  {
    title: "Ham & Cheese",
    image: "/images/food/Beach Road Pizza_Ham & Cheese.jpg",
  },
  {
    title: "Chicken",
    image: "/images/food/Beach Road Pizza_Chicken.jpg",
  },
];

const dealArcText = Array.from("BIG-NIGHT DEALS");

export default async function Home() {
  const [menu, hours] = await Promise.all([fetchMenu(), fetchHours()]);
  const deals = dealItems(menu?.categories);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantJsonLd(hours)) }} />
      <PromoModal />
      <section className="home-hero">
        <ScrollBackdrop />
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Your Christies Beach local</p>
            <h1 className="hero-heading">
              <span>Great pizzas.</span>
              <span>Great prices.</span>
              <span>For a great community.</span>
            </h1>
            <p className="hero-lead">
              Generous toppings, family-friendly value and plenty of choice for nights by the beach.
            </p>
            <div className="button-row">
              <a className="button" href={BUSINESS.orderUrl}>
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
              src="/images/hero/peri-peri-cutout-v1.png"
              alt=""
              width="1254"
              height="1254"
              fetchPriority="high"
            />
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

      <section className="food-marquee" aria-label="More Beach Road Pizza favourites">
        <div className="food-marquee-track">
          {[0, 1].map((group) => (
            <div className="food-marquee-group" aria-hidden={group === 1 ? "true" : undefined} key={group}>
              {movingFavourites.map((item) => (
                <figure key={`${group}-${item.title}`}>
                  <img
                    src={item.image}
                    alt={group === 0 ? `${item.title} from Beach Road Pizza` : ""}
                    width="760"
                    height="520"
                    loading="lazy"
                  />
                  <figcaption>{item.title}</figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>
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
        <div className="shell compact-section-head deal-section-head">
          <div className="deal-section-heading-copy">
            <p className="eyebrow">Straight from the menu</p>
            <h2 className="sr-only" id="deal-title">Big-night deals.</h2>
            <p>Pizza, bread and drinks bundled for easy family and group orders.</p>
          </div>
        </div>
        <div className="shell deal-feature deal-feature-reframed">
          <div className="deal-pizza-visual">
            <div className="deal-arc" aria-hidden="true">
              {dealArcText.map((letter, index) => {
                const angle = -58 + (116 * index) / (dealArcText.length - 1);
                return <span key={`${letter}-${index}`} style={{ rotate: `${angle}deg` }}>{letter === " " ? "\u00a0" : letter}</span>;
              })}
            </div>
            <img src="/images/cutouts/deals-cheesy-double-cutout-v2.png" alt="A whole golden Cheesy Double pizza from Beach Road Pizza" width="941" height="941" loading="lazy" />
          </div>
          <p>Order pickup online, or get delivery through Uber Eats and DoorDash.</p>
        </div>
        <div className="shell deal-list">
          {deals.length ? deals.map((deal) => (
            <article key={deal.id}>
              <h3>{formatPrice(deal.base_price)} {deal.name}</h3>
              {deal.description ? <p>{deal.description}</p> : null}
              <small>{deal.offer ? deal.offer.badge_label : "Beach Road Pizza menu deal."}</small>
              <a href={`/order#item-${deal.id}`}>
                Order this deal
              </a>
            </article>
          )) : (
            <article>
              <h3>Tonight&apos;s deals</h3>
              <p>Pizza, garlic bread and drink bundles for families and groups.</p>
              <small>Live prices are on the order page.</small>
              <a href="/order">See the deals</a>
            </article>
          )}
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

      <section className="pasta-preview">
        <div className="shell pasta-preview-grid">
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
          <div className="pasta-preview-copy">
            <p className="eyebrow">More than pizza</p>
            <h2>Pasta over flame.</h2>
            <p>Penne, spaghetti or fettuccine with nine comforting sauces—made hot for an easy local dinner.</p>
            <a className="button" href="/menu">See pasta on the menu</a>
          </div>
        </div>
      </section>

      <section className="visit-section" aria-labelledby="visit-title">
        <div className="shell visit-grid">
          <div className="visit-photo-grid" aria-label="Beach Road Pizza sides and classics">
            <img src="/images/food/Beach Road Pizza_Margherita.jpg" alt="Margherita pizza from Beach Road Pizza" width="760" height="520" loading="lazy" />
            <img src="/images/food/Beach Road Pizza_BBQ Chicken Wings.jpg" alt="BBQ chicken wings from Beach Road Pizza" width="760" height="520" loading="lazy" />
            <img src="/images/food/Beach Road Pizza_Chips.jpg" alt="Hot chips from Beach Road Pizza" width="760" height="520" loading="lazy" />
          </div>
          <div>
            <p className="eyebrow">Tonight on Beach Road</p>
            <h2 id="visit-title">Order, collect, find a sunset.</h2>
            <p><VenueAddress /></p>
            <div className="button-row">
              <a className="button" href={BUSINESS.mapsUrl} target="_blank" rel="noreferrer">Directions</a>
              <VenuePhoneLink className="button button-secondary" label="Call the shop" />
            </div>
          </div>
          <div className="hours-list">
            <HoursRows variant="list" />
            <TodayNote />
            <small>Public holiday hours can change. Call to confirm.</small>
          </div>
        </div>
      </section>
    </>
  );
}
