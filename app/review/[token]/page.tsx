import type { Metadata } from "next";
import { OrderReview } from "../../components/OrderReview";

// The token is a bearer credential: never indexed, never in canonical or
// share metadata, never cached publicly.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rate your order",
  description: "Tell Beach Road Pizza how your order went.",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
  referrer: "no-referrer",
};

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <OrderReview token={token} />;
}
