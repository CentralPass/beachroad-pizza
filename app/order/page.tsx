import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "../components/BreadcrumbJsonLd";
import { OrderExperience } from "../components/OrderExperience";
import { fetchMenu } from "../lib/server-api";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Order online for pickup",
  description: "Order Beach Road Pizza online for pickup from Christies Beach. Choose your sizes, pick a time and pay by card or in store.",
};

export default async function OrderPage() {
  const menu = await fetchMenu();
  return (
    <>
      <BreadcrumbJsonLd name="Order online" path="/order" />
      <section className="order-hero">
        <div className="shell">
          <p className="eyebrow">Order direct</p>
          <h1>Pizza night, sorted.</h1>
          <p>Choose your favourites, pick a pickup time and pay online or in store.</p>
        </div>
      </section>
      <div className="shell order-page">
        <OrderExperience initialMenu={menu} />
      </div>
    </>
  );
}
