"use client";

import { useCallback, useMemo, useState } from "react";
import { isVegan } from "../lib/menu";
import type { MenuItem, MenuResponse } from "../lib/types";
import { useLiveMenu } from "../lib/useLiveMenu";
import { useCart } from "./CartProvider";
import { ItemSheet } from "./ItemSheet";
import { MenuItemCard } from "./MenuItemCard";
import { useStoreStatus } from "./providers/StoreStatusProvider";
import { useToast } from "./providers/ToastProvider";
import { useVenue } from "./providers/VenueProvider";

type Chosen = { item: MenuItem; unavailable: boolean; message: string | null };

/**
 * The browse menu: search, category filter and vegan filter over the live
 * admin-managed menu. "Add to order" opens the same item sheet as the order
 * page, so sizes and extras are chosen the same way everywhere.
 */
export function MenuExplorer({ initialMenu }: { initialMenu: MenuResponse | null }) {
  const venue = useVenue();
  const toast = useToast();
  const { addItem, removeMenuItem } = useCart();
  const { acceptingOrders } = useStoreStatus();
  const onSoldOut = useCallback((itemId: number, name: string) => {
    const removed = removeMenuItem(itemId);
    toast(removed.length ? `${name} just sold out and was removed from your cart.` : `${name} just sold out.`, "warning", 6000);
  }, [removeMenuItem, toast]);
  const { menu, loading, error, fading, reload } = useLiveMenu({ initial: initialMenu, onSoldOut });

  const categories = useMemo(() => menu?.categories || [], [menu]);
  const [category, setCategory] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [veganOnly, setVeganOnly] = useState(false);
  const [chosen, setChosen] = useState<Chosen | null>(null);

  const activeCategory = categories.find((entry) => entry.id === category) || null;

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return categories
      .filter((entry) => category === "all" || entry.id === category)
      .flatMap((entry) => entry.items.map((item) => ({ item, category: entry })))
      .filter(({ item }) => !needle || `${item.name} ${item.description || ""}`.toLowerCase().includes(needle))
      .filter(({ item }) => !veganOnly || isVegan(item));
  }, [categories, category, query, veganOnly]);

  function clearFilters() {
    setCategory("all");
    setQuery("");
    setVeganOnly(false);
  }

  return (
    <section className="menu-explorer" aria-labelledby="menu-explorer-title">
      <div className="menu-tools">
        <div className="menu-search-wrap">
          <label htmlFor="menu-search">Search the menu</label>
          <input
            id="menu-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try chicken, garlic or vegan"
          />
        </div>
        <label className="check-control">
          <input type="checkbox" checked={veganOnly} onChange={(event) => setVeganOnly(event.target.checked)} />
          <span>Vegan only</span>
        </label>
      </div>

      {categories.length ? (
        <div className="category-tabs" aria-label="Menu categories">
          {[{ id: "all" as const, name: "All" }, ...categories].map((entry) => (
            <button
              type="button"
              key={entry.id}
              className={category === entry.id ? "is-active" : ""}
              aria-pressed={category === entry.id}
              onClick={() => setCategory(entry.id)}
            >
              {entry.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="menu-result-head">
        <div>
          <p className="eyebrow">{activeCategory ? "Category" : "Everything we make"}</p>
          <h2 id="menu-explorer-title">{activeCategory ? activeCategory.name : "The full menu"}</h2>
          {activeCategory?.available_now === false && activeCategory.availability_message ? (
            <p className="menu-window-note">{activeCategory.availability_message}</p>
          ) : null}
        </div>
        {menu ? <p aria-live="polite">{results.length} items</p> : null}
      </div>

      {loading && !menu ? (
        <div className="empty-state" role="status"><h3>Loading the menu…</h3></div>
      ) : !menu ? (
        <div className="empty-state" role="alert">
          <h3>We couldn&apos;t load the menu just now.</h3>
          <p>{error}</p>
          <div className="button-row">
            <button className="button" type="button" onClick={() => void reload()}>Try again</button>
            <a className="button button-secondary" href={venue.telHref}>Call {venue.phone}</a>
          </div>
        </div>
      ) : results.length ? (
        <div className="menu-list">
          {results.map(({ item, category: owner }) => (
            <MenuItemCard
              key={item.id}
              item={item}
              soldOut={fading.has(item.id)}
              unavailable={owner.available_now === false}
              unavailableNote={owner.availability_message}
              onChoose={(picked) => setChosen({ item: picked, unavailable: owner.available_now === false, message: owner.availability_message || null })}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>{categories.length ? "No menu items match that search." : "Nothing is on the menu right now."}</h3>
          <p>{categories.length ? "Try another ingredient or reset the filters." : "Please check back during opening hours."}</p>
          {categories.length ? <button className="text-button" type="button" onClick={clearFilters}>Reset menu filters</button> : null}
        </div>
      )}

      <div className="menu-order-bar">
        <p>
          <strong>Ready to order?</strong> Add your favourites, pick a pickup time and pay online or in store.
        </p>
        <a className="button" href="/order">Start your order</a>
      </div>

      {chosen ? (
        <ItemSheet
          item={chosen.item}
          storeOpen={acceptingOrders !== false}
          outsideServiceWindow={chosen.unavailable}
          serviceWindowMessage={chosen.message}
          onAdd={(item, modifiers, qty) => {
            addItem(item, modifiers, qty);
            toast(`Added ${item.name} to your order`, "success", 2500);
          }}
          onClose={() => setChosen(null)}
        />
      ) : null}
    </section>
  );
}
