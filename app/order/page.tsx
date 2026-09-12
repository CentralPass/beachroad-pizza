import type { Metadata } from "next";
import { MenuExplorer } from "../components/MenuExplorer";
import { OrderBuilder } from "../components/OrderBuilder";

export const metadata: Metadata = {
  title: "Order online",
  description: "Build a Beach Road Pizza order for pickup or delivery, ready for secure checkout.",
};

export default function OrderPage() {
  return (
    <>
      <section className="order-hero">
        <div className="shell">
          <p className="eyebrow">Order direct</p>
          <h1>Pizza night, sorted.</h1>
          <p>Choose your favourites, set pickup or delivery and review everything before checkout.</p>
        </div>
      </section>
      <div className="shell order-page">
        <OrderBuilder />
        <section className="order-menu-section" aria-labelledby="order-menu-heading">
          <p className="eyebrow">Still choosing?</p>
          <h2 id="order-menu-heading">Add something delicious.</h2>
          <MenuExplorer orderPage />
        </section>
      </div>
    </>
  );
}
