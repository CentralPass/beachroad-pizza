import type { Metadata } from "next";
import { OrderTracking } from "../../components/OrderTracking";

// The token is a bearer credential: never indexed, never in canonical or
// share metadata, never cached publicly.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Follow your Beach Road Pizza pickup order.",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
  referrer: "no-referrer",
};

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <OrderTracking token={token} />;
}
