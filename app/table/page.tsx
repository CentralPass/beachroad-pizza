import type { Metadata } from "next";
import { TableOrder } from "../components/TableOrder";

export const metadata: Metadata = {
  title: "Order at your table",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function TablePage() {
  return <TableOrder />;
}
