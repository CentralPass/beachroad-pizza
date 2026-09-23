import type { Metadata } from "next";
import { ManageBooking } from "../../../components/bookings/ManageBooking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: "/bookings" },
  openGraph: { url: "/bookings" },
  referrer: "no-referrer",
};

export default async function ManageBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="shell order-page">
      <ManageBooking token={token} />
    </div>
  );
}
