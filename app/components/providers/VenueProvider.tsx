"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../../lib/api";
import { FALLBACK, STATIC, fromPublicSettings, telHref, type VenueDetails } from "../../lib/venue";

type VenueValue = VenueDetails & typeof STATIC & { telHref: string; live: boolean };

const VenueContext = createContext<VenueValue | null>(null);

/**
 * Venue details fetched once for the whole site from GET /api/settings/public,
 * so a phone number changed in the admin portal changes everywhere at once.
 * Starts from FALLBACK so nothing renders blank while the fetch is in flight.
 */
export function VenueProvider({ children }: { children: ReactNode }) {
  const [details, setDetails] = useState<VenueDetails>(FALLBACK);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let active = true;
    api.get<Parameters<typeof fromPublicSettings>[0]>("/api/settings/public")
      .then((data) => {
        if (!active) return;
        setDetails(fromPublicSettings(data));
        setLive(true);
      })
      .catch(() => {
        // Non-critical: FALLBACK is this venue's own data.
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<VenueValue>(() => ({
    ...details,
    ...STATIC,
    telHref: telHref(details.phone),
    live,
  }), [details, live]);

  return <VenueContext.Provider value={value}>{children}</VenueContext.Provider>;
}

export function useVenue() {
  const context = useContext(VenueContext);
  if (!context) throw new Error("useVenue must be used inside VenueProvider");
  return context;
}
