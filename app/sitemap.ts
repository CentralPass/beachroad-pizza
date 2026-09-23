import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/venue";

// Public, indexable pages only. Checkout, tracking, booking management and
// table ordering are private and must never be listed.
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/menu", "/order", "/our-story", "/enquire", "/bookings", "/connect", "/privacy"].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/menu" || path === "/order" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/menu" || path === "/order" ? 0.9 : 0.6,
  }));
}
