"use client";

import { statusLabel } from "../lib/hours";
import { useStoreStatus } from "./providers/StoreStatusProvider";

/** Live open/closed line, from the same hours the backend enforces. */
export function StoreStatus() {
  const { today, ordersPaused, storeHours, failed } = useStoreStatus();
  const status = statusLabel(today, ordersPaused, storeHours);
  return (
    <span className={`store-status ${status?.open ? "is-open" : ""}`} aria-live="polite">
      {status?.label ?? (failed ? "Call to check today's hours" : "Checking today's hours")}
    </span>
  );
}
