"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { DeliveryConfig, DeliveryZone } from "./types";

/**
 * Delivery on offer right now, from CentralPass (GET /api/delivery/config).
 *
 * A venue without delivery answers { offered: false }, so the checkout simply
 * stays pickup-only. Times move on every minute, so this refreshes while the
 * page is open and when the tab comes back.
 */
export function useDeliveryConfig() {
  const [config, setConfig] = useState<DeliveryConfig | null>(null);

  const refresh = useCallback(async () => {
    try {
      setConfig(await api.get<DeliveryConfig>("/api/delivery/config"));
    } catch {
      // Delivery is an extra: if it can't be loaded, pickup still works.
      setConfig((current) => current ?? { offered: false });
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return { config, refresh };
}

export function zoneFor(config: DeliveryConfig | null, suburb: string, postcode: string): DeliveryZone | null {
  if (!config?.offered) return null;
  const area = config.areas.find((a) => a.suburb === suburb && a.postcode === postcode);
  return area ? config.zones.find((zone) => zone.id === area.zone_id) || null : null;
}

// The address is remembered on this device only, never looked up from the
// server by phone number: anyone can type a phone number.
export type SavedAddress = {
  address_line1: string;
  address_line2: string;
  suburb: string;
  postcode: string;
  instructions: string;
  leave_at_door: boolean;
};

const ADDRESS_KEY = "beach-road-pizza-delivery-address";

export function loadSavedAddress(): SavedAddress | null {
  try {
    const stored = window.localStorage.getItem(ADDRESS_KEY);
    return stored ? (JSON.parse(stored) as SavedAddress) : null;
  } catch {
    return null;
  }
}

export function saveAddress(address: SavedAddress) {
  try {
    window.localStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
  } catch {
    // Private browsing: they type it again next time.
  }
}
