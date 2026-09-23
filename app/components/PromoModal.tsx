"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useDialog } from "../lib/useDialog";
import { STORAGE_KEYS } from "../lib/venue";

type FeaturedOffer = { id: number; title: string; blurb: string; image_url: string | null };

function dismissed(id: number) {
  try {
    return (JSON.parse(window.sessionStorage.getItem(STORAGE_KEYS.promoDismissed) || "[]") as number[]).includes(id);
  } catch {
    return false;
  }
}

function remember(id: number) {
  try {
    const seen = JSON.parse(window.sessionStorage.getItem(STORAGE_KEYS.promoDismissed) || "[]") as number[];
    if (!seen.includes(id)) seen.push(id);
    window.sessionStorage.setItem(STORAGE_KEYS.promoDismissed, JSON.stringify(seen));
  } catch {
    // Showing it again is better than breaking the page.
  }
}

/**
 * The offer an admin has chosen to feature on the home page. Renders nothing
 * unless one is live. Dismissal is remembered per offer for the session, so
 * closing this week's deal never hides next week's.
 */
export function PromoModal() {
  const [promo, setPromo] = useState<FeaturedOffer | null>(null);
  const [open, setOpen] = useState(false);
  const [imageOk, setImageOk] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    api.get<FeaturedOffer[]>("/api/offers/featured")
      .then((list) => {
        if (cancelled) return;
        const next = (list || []).find((offer) => !dismissed(offer.id));
        if (!next) return;
        setPromo(next);
        timer = window.setTimeout(() => { if (!cancelled) setOpen(true); }, 900);
      })
      .catch(() => {
        // A promo is never worth breaking the home page for.
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const close = () => {
    if (promo) remember(promo.id);
    setOpen(false);
  };
  useDialog(panelRef, open, close);

  if (!open || !promo) return null;
  const hasImage = Boolean(promo.image_url) && imageOk;

  return (
    <div className="promo-layer">
      <button className="item-sheet-scrim" type="button" aria-label="Close offer" tabIndex={-1} onClick={close} />
      <div className={`promo-panel ${hasImage ? "" : "no-image"}`} role="dialog" aria-modal="true" aria-labelledby="promo-title" ref={panelRef} tabIndex={-1}>
        {hasImage ? <img src={promo.image_url!} alt="" onError={() => setImageOk(false)} /> : null}
        <div>
          <p className="eyebrow">Deal on now</p>
          <h2 id="promo-title">{promo.title}</h2>
          <p>{promo.blurb}</p>
          <div className="button-row">
            <a className="button" href="/order#offers" onClick={() => remember(promo.id)}>See the deal</a>
            <button className="button button-secondary" type="button" onClick={close}>Keep browsing</button>
          </div>
        </div>
      </div>
    </div>
  );
}
