import type { Metadata } from "next";
import { MenuExplorer } from "../components/MenuExplorer";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Search Beach Road Pizza's traditional, gourmet and vegan pizzas, plus sides, pasta and schnitzels with current direct-order prices.",
};

export default function MenuPage() {
  return (
    <>
      <section className="inner-hero menu-hero">
        <div className="shell inner-hero-grid">
          <div>
            <p className="eyebrow">Pizza, pasta and more</p>
            <h1>Find tonight&apos;s favourite.</h1>
            <p>
              Search by name, tap a category and check prices without opening a PDF.
            </p>
          </div>
          <img
            className="page-photo"
            src="/images/official/beach-road-special.jpg"
            alt="A generously topped pizza photographed by Beach Road Pizza"
            width="700"
            height="700"
            fetchPriority="high"
          />
        </div>
      </section>
      <div className="shell menu-page-content">
        <div className="menu-notice">
          <strong>Current direct-order menu prices.</strong>
          <span>Gluten-free bases are available in large for $5. Platform pricing, half-and-half choices and extras can change the total.</span>
        </div>
        <section className="menu-drawn-feature" aria-labelledby="schnitzel-feature-title">
          <figure className="credited-photo">
            <img src="/images/stock/schnitzel-and-chips-pexels.jpg" alt="Crispy chicken schnitzel served with hot chips" width="1400" height="933" loading="lazy" />
            <figcaption>
              Photo: <a href="https://www.pexels.com/photo/crispy-chicken-with-fries-5652265/" target="_blank" rel="noreferrer">Kai-Chieh Chan via Pexels</a>
            </figcaption>
          </figure>
          <div>
            <p className="eyebrow">More than pizza</p>
            <h2 id="schnitzel-feature-title">Schnitzels in a pizza box.</h2>
            <p>Seven builds, all served with chips—from the classic Snitty to Lamb with tzatziki.</p>
          </div>
        </section>
        <MenuExplorer />
      </div>
    </>
  );
}
