import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "../components/BreadcrumbJsonLd";
import { SubscribeForm } from "../components/SubscribeForm";
import { BUSINESS } from "../lib/site-data";

export const metadata: Metadata = {
  title: "Deals by email",
  description: "Join the Beach Road Pizza mailing list for local deals and news from Christies Beach.",
};

export default function ConnectPage() {
  return (
    <>
      <BreadcrumbJsonLd name="Deals by email" path="/connect" />
      <section className="order-hero connect-hero">
        <div className="shell">
          <p className="eyebrow">Stay in the loop</p>
          <h1>First dibs on the deals.</h1>
          <p>Join the list for new pizzas, family deals and the odd surprise. No spam, and you can leave any time.</p>
        </div>
      </section>
      <div className="shell order-page connect-layout">
        <section className="order-details">
          <p className="eyebrow">Mailing list</p>
          <h2>Deals in your inbox.</h2>
          <SubscribeForm />
        </section>
        <aside className="order-total-card">
          <p className="eyebrow">Follow along</p>
          <p>Specials, new menu items and community news.</p>
          <a className="button" href={BUSINESS.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>
          <a className="button button-secondary" href={BUSINESS.facebookUrl} target="_blank" rel="noreferrer">Facebook</a>
        </aside>
      </div>
    </>
  );
}
