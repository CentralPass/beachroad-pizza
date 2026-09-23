import { API_URL } from "./api";
import type { HoursResponse, MenuResponse } from "./types";

/**
 * Server-side reads for pages that should render real content for search
 * engines. Short revalidation keeps them close to live; the client refreshes
 * again on mount, and ordering never trusts these copies (the quote does).
 */
async function serverGet<T>(path: string, revalidate: number): Promise<T | null> {
  if (!API_URL) return null;
  try {
    const response = await fetch(`${API_URL}${path}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const fetchMenu = () => serverGet<MenuResponse>("/api/menu", 60);
export const fetchHours = () => serverGet<HoursResponse>("/api/settings/hours", 300);
