"use client";

import { useEffect, useState } from "react";
import { ApiError, api } from "./api";
import type { BookingConfig } from "./types";

type State = { config: BookingConfig | null; loaded: boolean; online: boolean };

let cached: Promise<BookingConfig | null> | null = null;

function fetchConfig() {
  // 402 means CentralPass has not entitled this venue to bookings (switched
  // off in the Console); treat it like bookings being off.
  cached ??= api.get<BookingConfig>("/api/bookings/config").catch((error: ApiError) => {
    if (error.status !== 402) cached = null;
    return null;
  });
  return cached;
}

/** Whether online table bookings are live for this venue right now. */
export function useBookingConfig(): State {
  const [state, setState] = useState<State>({ config: null, loaded: false, online: false });
  useEffect(() => {
    let active = true;
    fetchConfig().then((config) => {
      if (!active) return;
      setState({ config, loaded: true, online: Boolean(config?.enabled && config.provider === "native") });
    });
    return () => {
      active = false;
    };
  }, []);
  return state;
}
