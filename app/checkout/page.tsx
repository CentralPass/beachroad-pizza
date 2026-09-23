import type { Metadata } from "next";
import { CheckoutFlow } from "../components/checkout/CheckoutFlow";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Beach Road Pizza pickup order.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <>
      <section className="order-hero checkout-hero">
        <div className="shell">
          <p className="eyebrow">Checkout</p>
          <h1>Almost pizza time.</h1>
        </div>
      </section>
      <div className="shell order-page">
        <CheckoutFlow />
      </div>
    </>
  );
}
