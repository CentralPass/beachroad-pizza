"use client";

import { useMemo, useState } from "react";
import type { MenuItem } from "../lib/site-data";
import { formatPrice, menuOptions, useCart } from "./CartProvider";

export function AddToCartControls({ item }: { item: MenuItem }) {
  const options = useMemo(() => menuOptions(item), [item]);
  const [selected, setSelected] = useState(options[0]?.label ?? "Standard");
  const { addItem } = useCart();
  const option = options.find((entry) => entry.label === selected) ?? options[0];

  return (
    <div className="menu-item-actions">
      {options.length > 1 ? (
        <label>
          <span className="sr-only">Choose a size for {item.name}</span>
          <select value={selected} onChange={(event) => setSelected(event.target.value)}>
            {options.map((entry) => (
              <option value={entry.label} key={entry.label}>{entry.label} · {formatPrice(entry.price)}</option>
            ))}
          </select>
        </label>
      ) : <span className="item-price-confirmed">{formatPrice(option.price)}</span>}
      <button className="add-to-cart" type="button" onClick={() => addItem(item, option)}>Add to order</button>
    </div>
  );
}
