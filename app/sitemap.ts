import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = "https://beachroadpizza.com.au";
  return ["", "/menu", "/our-story", "/enquire", "/privacy"].map((path) => ({
    url: `${origin}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/menu" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/menu" ? 0.9 : 0.7,
  }));
}
