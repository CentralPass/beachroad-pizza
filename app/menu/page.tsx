import type { Metadata } from "next";
import { MenuExplorer } from "../components/MenuExplorer";
import { MotionRail } from "../components/MotionRail";

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
          <div className="page-art page-art-menu">
            <span className="page-art-label page-art-label-one" aria-hidden="true">Gourmet</span>
            <span className="page-art-label page-art-label-two" aria-hidden="true">Vegan + GF</span>
            <span className="page-art-label page-art-label-three" aria-hidden="true">Pasta too</span>
            <img
              className="page-cutout page-cutout-menu"
              src="/images/cutouts/menu-special-cutout-v1.png"
              alt="A generously topped Beach Road Pizza special"
              width="1254"
              height="1254"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>
      <MotionRail
        label="Menu highlights"
        tone="coral"
        items={["Traditional pizzas", "Gourmet favourites", "Vegan choices", "Pasta", "Schnitzels", "Sides"]}
      />
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
