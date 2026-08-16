"use client";

import { useEffect, useState } from "react";

type Status = {
  open: boolean;
  label: string;
};

const closingMinutes: Record<string, number> = {
  Monday: 21 * 60,
  Tuesday: 21 * 60,
  Wednesday: 21 * 60,
  Thursday: 21 * 60,
  Friday: 21 * 60 + 30,
  Saturday: 21 * 60 + 30,
  Sunday: 21 * 60 + 30,
};

function getStatus(): Status {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Adelaide",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Monday";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const now = hour * 60 + minute;
  const close = closingMinutes[weekday];
  const open = now >= 15 * 60 && now < close;
  const closeLabel = close % 60 === 0 ? "9:00 pm" : "9:30 pm";

  return open
    ? { open: true, label: `Open now, closes ${closeLabel}` }
    : { open: false, label: "Closed now, opens 3:00 pm" };
}

export function StoreStatus() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const update = () => setStatus(getStatus());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className={`store-status ${status?.open ? "is-open" : ""}`} aria-live="polite">
      {status?.label ?? "Checking today's hours"}
    </span>
  );
}
