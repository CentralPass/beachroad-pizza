"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { venueDate } from "../lib/hours";
import { SITE_NOTICE } from "../lib/venue";

const PRIVATE = ["/track", "/table", "/bookings/manage", "/checkout"];

/** A time-bound notice (e.g. holiday closure) that removes itself after its end date. */
export function SiteNotice() {
  const pathname = usePathname() || "/";
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setToday(venueDate()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!SITE_NOTICE || !today || PRIVATE.some((prefix) => pathname.startsWith(prefix))) return null;
  if (today > SITE_NOTICE.until || (SITE_NOTICE.from && today < SITE_NOTICE.from)) return null;
  return (
    <aside className="site-notice" role="status">
      <div className="shell">
        <span>{SITE_NOTICE.message}</span>
        {SITE_NOTICE.href ? <a href={SITE_NOTICE.href}>{SITE_NOTICE.action || "Find out more"}</a> : null}
      </div>
    </aside>
  );
}
