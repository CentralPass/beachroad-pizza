"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../../lib/api";
import type { HoursResponse, PickupConfig, StoreHour, TodayInfo } from "../../lib/types";

type StoreStatus = {
  loaded: boolean;
  failed: boolean;
  storeHours: StoreHour[] | null;
  today: TodayInfo | null;
  // null while loading: never block ordering on an unknown state.
  isOpenNow: boolean | null;
  ordersPaused: boolean;
  acceptingOrders: boolean | null;
  pickup: PickupConfig | null;
  refresh: () => void;
};

const StoreStatusContext = createContext<StoreStatus | null>(null);

/**
 * Live hours, open/closed, pause state and pickup settings from
 * GET /api/settings/hours. Refreshed every minute and whenever the tab becomes
 * visible again, so a pause set in the staff app reaches an open browser fast.
 * The backend still enforces all of it on order creation.
 */
export function StoreStatusProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<HoursResponse | null>(null);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(() => {
    api.get<HoursResponse>("/api/settings/hours")
      .then((next) => {
        setData(next);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const value = useMemo<StoreStatus>(() => ({
    loaded: Boolean(data),
    failed,
    storeHours: data?.store_hours ?? null,
    today: data?.today ?? null,
    isOpenNow: data ? Boolean(data.today?.is_open_now) : null,
    ordersPaused: data?.orders_paused === true,
    acceptingOrders: data ? Boolean(data.accepting_orders) : null,
    pickup: data?.pickup ?? null,
    refresh,
  }), [data, failed, refresh]);

  return <StoreStatusContext.Provider value={value}>{children}</StoreStatusContext.Provider>;
}

export function useStoreStatus() {
  const context = useContext(StoreStatusContext);
  if (!context) throw new Error("useStoreStatus must be used inside StoreStatusProvider");
  return context;
}
