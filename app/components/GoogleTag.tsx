"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";
import { ADS_ID, trackPageView } from "../lib/analytics";

// Private pages never load the tag at all.
const NO_TAG = ["/table", "/track", "/bookings/manage"];

/** Optional Google Ads tag. Renders nothing unless NEXT_PUBLIC_GOOGLE_ADS_ID is set. */
export function GoogleTag() {
  const pathname = usePathname() || "/";
  const blocked = NO_TAG.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    if (!blocked) trackPageView(pathname);
  }, [pathname, blocked]);

  if (!ADS_ID || blocked) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${ADS_ID}`} strategy="afterInteractive" />
      <Script id="google-ads-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || []; window.gtag = function(){ window.dataLayer.push(arguments); }; window.gtag('js', new Date()); window.gtag('config', '${ADS_ID}', { send_page_view: false });`}
      </Script>
    </>
  );
}
