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
            className="page-illustration"
            src="/images/illustrations/menu-pasta-v2.png"
            alt="Simple painted bowl of tomato pasta"
            width="1000"
            height="1000"
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
          <img src="/images/illustrations/schnitzel-box-v3.png" alt="Hand-drawn chicken schnitzel, chips, gravy and lemon served in a pizza box" width="1456" height="1092" loading="lazy" />
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
