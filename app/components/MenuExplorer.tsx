"use client";

import { useMemo, useState } from "react";
import { BUSINESS, CATEGORIES, MENU, type MenuCategory } from "../lib/site-data";

export function MenuExplorer() {
  const [category, setCategory] = useState<"All" | MenuCategory>("Traditional pizzas");
  const [query, setQuery] = useState("");
  const [veganOnly, setVeganOnly] = useState(false);

  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return MENU.filter((item) => {
      const categoryMatch = category === "All" || item.category === category;
      const queryMatch = !needle || `${item.name} ${item.description}`.toLowerCase().includes(needle);
      const veganMatch = !veganOnly || item.vegan;
      return categoryMatch && queryMatch && veganMatch;
    });
  }, [category, query, veganOnly]);

  function clearFilters() {
    setCategory("All");
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
            placeholder="Try yiros, chicken or garlic"
          />
        </div>
        <label className="check-control">
          <input type="checkbox" checked={veganOnly} onChange={(event) => setVeganOnly(event.target.checked)} />
          <span>Vegan only</span>
        </label>
      </div>

      <div className="category-tabs" aria-label="Menu categories">
        {CATEGORIES.map((item) => (
          <button
            type="button"
            key={item}
            className={category === item ? "is-active" : ""}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="menu-result-head">
        <div>
          <p className="eyebrow">Choose a category</p>
          <h2 id="menu-explorer-title">{category === "All" ? "The full menu" : category}</h2>
        </div>
        <p aria-live="polite">{items.length} items</p>
      </div>

      {items.length ? (
        <div className="menu-list">
          {items.map((item) => (
            <article className="menu-item" key={`${item.category}-${item.name}`}>
              {item.image ? (
                <img src={item.image} alt={`${item.name} from Beach Road Pizza`} width="520" height="300" loading="lazy" />
              ) : null}
              <div className="menu-item-copy">
                <div className="menu-item-title">
                  <h3>{item.name}</h3>
                  <strong>{item.price}</strong>
                </div>
                <p>{item.description}</p>
                <div className="menu-labels">
                  {item.popular ? <span>Local favourite</span> : null}
                  {item.vegan ? <span>Vegan</span> : null}
                </div>
                {item.sizes ? (
                  <details className="size-details">
                    <summary>See sizes</summary>
                    <p>{item.sizes}</p>
                  </details>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No menu items match that search.</h3>
          <p>Try another ingredient or reset the filters.</p>
          <button className="text-button" type="button" onClick={clearFilters}>
            Reset menu filters
          </button>
        </div>
      )}

      <div className="menu-order-bar">
        <p>
          <strong>Ready to order?</strong> Confirm live availability, extras and your final total in the official ordering system.
        </p>
        <a className="button" href={BUSINESS.orderUrl} target="_blank" rel="noreferrer">
          Order from Beach Road Pizza
        </a>
      </div>
    </section>
  );
}
