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
            <p className="eyebrow">The full line-up</p>
            <h1>Find tonight's favourite.</h1>
            <p>
              Search by name or ingredient, move between categories and check size prices without opening a PDF.
            </p>
          </div>
          <img
            src="/images/food/Beach Road Pizza_Pepporini.jpg"
            alt="Pepperoni pizza from Beach Road Pizza"
            width="1200"
            height="680"
            fetchPriority="high"
          />
        </div>
      </section>
      <div className="shell menu-page-content">
        <div className="menu-notice">
          <strong>Prices shown are current direct-order menu prices.</strong>
          <span>Platform pricing, half-and-half choices, extras and gluten-free bases can change the total.</span>
        </div>
        <MenuExplorer />
      </div>
    </>
  );
}
