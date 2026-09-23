"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatClock, formatMoney } from "../lib/format";
import { findItem } from "../lib/menu";
import type { MenuCategory, MenuItem, MenuResponse } from "../lib/types";
import { useLiveMenu } from "../lib/useLiveMenu";
import { LinePrice, ModifierList, PromoCodeField, QuantityControl, QuoteRows, useCart } from "./CartProvider";
import { ItemSheet } from "./ItemSheet";
import { MenuItemCard } from "./MenuItemCard";
import { useStoreStatus } from "./providers/StoreStatusProvider";
import { useToast } from "./providers/ToastProvider";
import { useVenue } from "./providers/VenueProvider";

type Chosen = { item: MenuItem; category: MenuCategory };
type DisplayCategory = Omit<MenuCategory, "id"> & { id: number | "offers"; guests?: Map<number, MenuCategory> };

export function OrderExperience({ initialMenu }: { initialMenu: MenuResponse | null }) {
  const toast = useToast();
  const { addItem, removeMenuItem } = useCart();
  const onSoldOut = useCallback((itemId: number, name: string) => {
    const removed = removeMenuItem(itemId);
    toast(removed.length ? `Sorry, ${name} just sold out and was removed from your order.` : `Sorry, ${name} just sold out.`, "warning", 6000);
  }, [removeMenuItem, toast]);
  const onAvailable = useCallback((name: string) => toast(`${name} is available again`, "success"), [toast]);
  const live = useLiveMenu({ initial: initialMenu, onSoldOut, onAvailable });
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const { acceptingOrders } = useStoreStatus();

  return (
    <>
      <OrderNotices />
      <OrderBasket />
      <section className="order-menu-section" aria-labelledby="order-menu-heading">
        <p className="eyebrow">Build your order</p>
        <h2 id="order-menu-heading">Add something delicious.</h2>
        <OrderMenu live={live} onChoose={setChosen} />
      </section>
      {chosen ? (
        <ItemSheet
          item={chosen.item}
          storeOpen={acceptingOrders !== false}
          outsideServiceWindow={chosen.category.available_now === false}
          serviceWindowMessage={chosen.category.availability_message}
          onAdd={(item, modifiers, qty) => addItem(item, modifiers, qty)}
          onClose={() => setChosen(null)}
        />
      ) : null}
    </>
  );
}

function OrderNotices() {
  const { ordersPaused, acceptingOrders, today, loaded, failed } = useStoreStatus();
  const surcharge = today?.is_special_day && today.surcharge_percent > 0 ? today : null;
  const opensLater = today?.is_open && !today.is_open_now && today.open_time;
  return (
    <div className="order-notices" aria-live="polite">
      {ordersPaused ? (
        <p className="order-notice order-notice-alert" role="alert">
          <strong>Online orders are paused.</strong> We&apos;ll be taking orders again shortly. You can still browse and build your cart.
        </p>
      ) : loaded && acceptingOrders === false ? (
        <p className="order-notice order-notice-alert" role="alert">
          <strong>We&apos;re closed right now.</strong>{" "}
          {opensLater ? `Online ordering opens today at ${formatClock(today?.open_time)}.` : "Check our opening hours and order when we're open."}
        </p>
      ) : null}
      {surcharge ? (
        <p className="order-notice">
          <strong>{surcharge.surcharge_label || `A ${surcharge.surcharge_percent}% public holiday surcharge applies today.`}</strong> It&apos;s included in your total.
        </p>
      ) : null}
      {failed && !loaded ? (
        <p className="order-notice order-notice-alert" role="alert">We can&apos;t check the shop&apos;s hours right now. Your order will be confirmed when you check out.</p>
      ) : null}
    </div>
  );
}

function OrderBasket() {
  const router = useRouter();
  const venue = useVenue();
  const { lines, subtotal, total, quote, quoteStatus, quoteProblem, discountCode, removeLine } = useCart();
  const { ordersPaused, acceptingOrders } = useStoreStatus();
  const blocked = ordersPaused || acceptingOrders === false || Boolean(quoteProblem) || !lines.length;

  return (
    <div className="order-builder">
      <section className="order-basket" aria-labelledby="order-basket-title">
        <div className="order-card-head">
          <div>
            <p className="eyebrow">Your order</p>
            <h2 id="order-basket-title">Your favourites.</h2>
          </div>
          <a className="text-link" href="#order-menu-heading">Add from menu</a>
        </div>
        {lines.length ? (
          <div className="order-lines">
            {lines.map((line, index) => (
              <article className="order-line" key={line.id}>
                {line.item.image_url ? <img src={line.item.image_url} alt="" width="130" height="100" /> : <span className="order-line-mark" aria-hidden="true">BRP</span>}
                <div className="order-line-copy">
                  <strong>{line.item.name}</strong>
                  <ModifierList modifiers={line.modifiers} />
                  <QuantityControl line={line} />
                </div>
                <div className="order-line-total">
                  <LinePrice line={line} index={index} quote={quote} />
                  <button type="button" onClick={() => removeLine(line.id)}>Remove</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="order-empty">
            <h3>Your cart is empty.</h3>
            <p>Browse the menu below and tap an item to add it.</p>
            <a className="button" href="#order-menu-heading">Start with the menu</a>
          </div>
        )}
        <p className="order-delivery-note">
          Online orders are for pickup from {venue.address}. Want it delivered?{" "}
          <a href={venue.delivery.uberEats} target="_blank" rel="noreferrer">Uber Eats</a> or{" "}
          <a href={venue.delivery.doorDash} target="_blank" rel="noreferrer">DoorDash</a>.
        </p>
      </section>

      <aside className="order-total-card" aria-label="Order total">
        <QuoteRows quote={quote} subtotal={subtotal} discountCode={discountCode} />
        <div className="order-grand-total"><span>Total</span><strong>{formatMoney(total)}</strong></div>
        <p aria-live="polite">
          {quoteProblem
            ? quoteProblem
            : quoteStatus === "loading"
              ? "Updating your total…"
              : quoteStatus === "error"
                ? "We couldn't refresh your total. It will be confirmed at checkout."
                : "Includes GST. Offers and promo codes are applied automatically."}
        </p>
        {lines.length ? <PromoCodeField /> : null}
        <button className="button" type="button" disabled={blocked} onClick={() => router.push("/checkout")}>
          Checkout
        </button>
      </aside>
    </div>
  );
}

function OrderMenu({ live, onChoose }: { live: ReturnType<typeof useLiveMenu>; onChoose: (chosen: Chosen) => void }) {
  const venue = useVenue();
  const { menu, loading, error, fading, reload } = live;
  const categories = useMemo(() => menu?.categories || [], [menu]);
  const orderOffers = useMemo(() => menu?.offers || [], [menu]);

  // A pinned Offers group collecting every discounted item, so a deal is seen
  // before scrolling past eight categories. Items also stay in their own
  // category, which is where their availability comes from.
  const displayCategories = useMemo<DisplayCategory[]>(() => {
    const guests = new Map<number, MenuCategory>();
    const items: MenuItem[] = [];
    for (const category of categories) {
      if (category.available_now === false) continue;
      for (const item of category.items) {
        if (item.offer) {
          items.push(item);
          guests.set(item.id, category);
        }
      }
    }
    const offers = items.length || orderOffers.length
      ? [{ id: "offers" as const, name: "Offers", description: null, available_now: true, items, guests }]
      : [];
    return [...offers, ...categories];
  }, [categories, orderOffers]);

  const [active, setActive] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const centred = useRef(false);

  useEffect(() => {
    if (!displayCategories.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive((entry.target as HTMLElement).dataset.catId || null);
      });
    }, { rootMargin: "-140px 0px -55% 0px", threshold: 0 });
    displayCategories.forEach((category) => {
      const element = document.getElementById(`cat-${category.id}`);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [displayCategories]);

  // Keep the highlighted tab visible without scrolling the page vertically.
  useEffect(() => {
    const nav = navRef.current;
    const pill = active ? pillRefs.current[active] : null;
    if (!nav || !pill) return;
    const target = pill.offsetLeft - (nav.clientWidth - pill.offsetWidth) / 2;
    const left = Math.max(0, Math.min(target, nav.scrollWidth - nav.clientWidth));
    if (Math.abs(nav.scrollLeft - left) < 2) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    nav.scrollTo({ left, behavior: centred.current && !reduce ? "smooth" : "auto" });
    centred.current = true;
  }, [active]);

  // Deep links from the home page: /order#offers and /order#item-123.
  useEffect(() => {
    if (!categories.length) return;
    const follow = () => {
      const hash = window.location.hash;
      if (hash === "#offers" && displayCategories[0]?.id === "offers") {
        document.getElementById("cat-offers")?.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }
      const match = hash.match(/^#item-(\d+)$/);
      if (!match) return;
      window.history.replaceState(null, "", window.location.pathname);
      const found = findItem(categories, Number(match[1]));
      if (!found) return;
      document.getElementById(`cat-${found.category.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      onChoose(found);
    };
    const timer = window.setTimeout(follow, 0);
    window.addEventListener("hashchange", follow);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", follow);
    };
  }, [categories, displayCategories, onChoose]);

  if (loading && !menu) {
    return <div className="empty-state" role="status"><h3>Loading the menu…</h3></div>;
  }
  if (!menu) {
    return (
      <div className="empty-state" role="alert">
        <h3>We couldn&apos;t load the menu just now.</h3>
        <p>{error}</p>
        <div className="button-row">
          <button className="button" type="button" onClick={() => void reload()}>Try again</button>
          <a className="button button-secondary" href={venue.telHref}>Call {venue.phone}</a>
        </div>
      </div>
    );
  }
  if (!categories.length) {
    return (
      <div className="empty-state">
        <h3>Nothing is available to order right now.</h3>
        <p>Check back during opening hours, or call us on <a href={venue.telHref}>{venue.phone}</a>.</p>
      </div>
    );
  }

  return (
    <div className="order-menu">
      <nav className="order-category-nav" aria-label="Menu categories" ref={navRef}>
        {displayCategories.map((category) => {
          const key = String(category.id);
          return (
            <button
              type="button"
              key={key}
              ref={(element) => {
                pillRefs.current[key] = element;
              }}
              className={`${active === key ? "is-active" : ""} ${category.available_now === false ? "is-later" : ""}`}
              aria-current={active === key ? "true" : undefined}
              onClick={() => document.getElementById(`cat-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              {category.name}
            </button>
          );
        })}
      </nav>

      {displayCategories.map((category) => (
        <section className="order-category" key={String(category.id)} id={`cat-${category.id}`} data-cat-id={String(category.id)} aria-labelledby={`cat-title-${category.id}`}>
          <div className="order-category-head">
            <h3 id={`cat-title-${category.id}`}>{category.name}</h3>
            {category.available_now === false && category.availability_message ? (
              <p className="menu-window-note">{category.availability_message}</p>
            ) : null}
            {category.description ? <p>{category.description}</p> : null}
          </div>
          {category.id === "offers" && orderOffers.length ? (
            <ul className="offer-banners">
              {orderOffers.map((offer) => (
                <li key={offer.id}>
                  <strong>{offer.badge_label}</strong>
                  <span>{offer.min_order_value > 0 ? `On orders over ${formatMoney(offer.min_order_value)}, applied automatically.` : "Applied automatically at checkout."}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="menu-list">
            {category.items.map((item) => {
              const owner: MenuCategory = category.guests?.get(item.id) || { ...category, id: Number(category.id) };
              return (
                <MenuItemCard
                  key={`${category.id}-${item.id}`}
                  item={item}
                  soldOut={fading.has(item.id)}
                  unavailable={owner.available_now === false}
                  unavailableNote={owner.availability_message}
                  onChoose={(picked) => onChoose({ item: picked, category: owner })}
                />
              );
            })}
          </div>
        </section>
      ))}

      <p className="allergen-note">
        <strong>Allergens:</strong> our food is prepared in a kitchen that handles gluten, dairy, eggs, nuts, soy, seafood and sesame, so we can&apos;t guarantee any item is free from traces. Dietary labels are a guide only. If you have an allergy or intolerance, please call us on <a href={venue.telHref}>{venue.phone}</a> before ordering.
      </p>
    </div>
  );
}
