"use client";

import { dietaryLabel, formatPrice, toNumber } from "../lib/format";
import { priceLabel, sizeSummary } from "../lib/menu";
import type { MenuItem } from "../lib/types";

type Props = {
  item: MenuItem;
  onChoose: (item: MenuItem) => void;
  unavailable?: boolean;
  unavailableNote?: string | null;
  soldOut?: boolean;
  priceFactor?: number;
  actionLabel?: string;
};

export function MenuItemCard({ item, onChoose, unavailable = false, unavailableNote = null, soldOut = false, priceFactor = 1, actionLabel = "Add to order" }: Props) {
  const sizes = sizeSummary(item);
  const offerPrice = item.offer?.discounted_price;
  return (
    <article className={`menu-item ${soldOut ? "is-sold-out" : ""} ${unavailable ? "is-unavailable" : ""}`}>
      {item.image_url ? (
        <img src={item.image_url} alt={`${item.name} from Beach Road Pizza`} width="520" height="300" loading="lazy" decoding="async" />
      ) : null}
      <div className="menu-item-copy">
        <div className="menu-item-title">
          <h3>{item.name}</h3>
          <strong>
            {offerPrice != null ? (
              <><s>{formatPrice(toNumber(item.base_price) * priceFactor)}</s> {formatPrice(offerPrice * priceFactor)}</>
            ) : priceFactor === 1 ? priceLabel(item) : formatPrice(toNumber(item.base_price) * priceFactor)}
          </strong>
        </div>
        {item.description ? <p>{item.description}</p> : null}
        <div className="menu-labels">
          {item.offer ? <span className="label-offer">{item.offer.badge_label}</span> : null}
          {item.is_featured ? <span>Local favourite</span> : null}
          {(item.dietary_tags || []).map((tag) => <span key={tag}>{dietaryLabel(tag)}</span>)}
          {soldOut ? <span className="label-sold-out">Sold out</span> : null}
        </div>
        {sizes && priceFactor === 1 ? (
          <details className="size-details">
            <summary>See sizes</summary>
            <p>{sizes}</p>
          </details>
        ) : null}
        {unavailable && unavailableNote ? <p className="menu-item-note">{unavailableNote}</p> : null}
        <div className="menu-item-actions">
          <button className="add-to-cart" type="button" onClick={() => onChoose(item)} disabled={soldOut} aria-label={`${actionLabel}: ${item.name}`}>
            {soldOut ? "Sold out" : (item.modifier_groups?.length ? "Choose options" : actionLabel)}
          </button>
        </div>
      </div>
    </article>
  );
}
