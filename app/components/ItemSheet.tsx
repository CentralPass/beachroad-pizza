"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { dietaryLabel, formatDelta, formatMoney, formatPrice, toNumber } from "../lib/format";
import type { MenuItem, ModifierGroup, ModifierOption } from "../lib/types";
import { useDialog } from "../lib/useDialog";

type Props = {
  item: MenuItem;
  storeOpen?: boolean;
  // The item's category is outside its service window: still browsable, not addable.
  outsideServiceWindow?: boolean;
  serviceWindowMessage?: string | null;
  // Table ordering reuses this sheet with its own basket and surcharge-inclusive prices.
  priceFactor?: number;
  maxQuantity?: number;
  addLabel?: string;
  onAdd: (item: MenuItem, modifiers: ModifierOption[], qty: number) => void;
  onClose: () => void;
};

type Selections = Record<number, number | null | Set<number>>;

const isSingle = (group: ModifierGroup) => group.max_selections === 1;

function groupHint(group: ModifierGroup) {
  const min = group.min_selections || 0;
  const max = group.max_selections;
  if (max === 1) return group.required ? "Choose 1" : "Optional";
  if (min > 0 && max && min === max) return `Choose ${min}`;
  if (min > 0 && max) return `Choose ${min} to ${max}`;
  if (max) return group.required ? `Choose up to ${max}` : `Optional, up to ${max}`;
  if (min > 0) return `Choose at least ${min}`;
  return group.required ? "Choose at least 1" : "Optional";
}

function initialSelections(groups: ModifierGroup[]): Selections {
  return Object.fromEntries(groups.map((group) => [group.id, isSingle(group) ? null : new Set<number>()]));
}

export function ItemSheet({
  item,
  storeOpen = true,
  outsideServiceWindow = false,
  serviceWindowMessage = null,
  priceFactor = 1,
  maxQuantity = 99,
  addLabel = "Add to order",
  onAdd,
  onClose,
}: Props) {
  const groups = useMemo(() => item.modifier_groups || [], [item]);
  const [selections, setSelections] = useState<Selections>(() => initialSelections(groups));
  const [qty, setQty] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useDialog(sheetRef, true, close);

  const chosen = useMemo(() => groups.flatMap((group) => {
    const selection = selections[group.id];
    if (isSingle(group)) return selection == null ? [] : group.options.filter((option) => option.id === selection);
    return group.options.filter((option) => (selection as Set<number>)?.has(option.id));
  }), [groups, selections]);

  const problems = useMemo(() => Object.fromEntries(groups.map((group) => {
    const selection = selections[group.id];
    const count = isSingle(group) ? (selection == null ? 0 : 1) : (selection as Set<number>)?.size || 0;
    const min = Math.max(group.min_selections || 0, group.required ? 1 : 0);
    return [group.id, count < min ? (isSingle(group) ? "Please choose one." : `Please choose at least ${min}.`) : null];
  })), [groups, selections]);

  const valid = Object.values(problems).every((problem) => !problem);
  const unitPrice = toNumber(item.base_price) + chosen.reduce((sum, option) => sum + toNumber(option.price_delta), 0);
  const canAdd = storeOpen && !outsideServiceWindow;

  function chooseSingle(group: ModifierGroup, optionId: number) {
    // An optional choice can be cleared by picking it again.
    setSelections((current) => ({ ...current, [group.id]: !group.required && current[group.id] === optionId ? null : optionId }));
  }

  function toggleMulti(group: ModifierGroup, optionId: number, checked: boolean) {
    setSelections((current) => {
      const next = new Set(current[group.id] as Set<number>);
      if (checked) {
        if (group.max_selections != null && next.size >= group.max_selections) return current;
        next.add(optionId);
      } else {
        next.delete(optionId);
      }
      return { ...current, [group.id]: next };
    });
  }

  function add() {
    if (!canAdd) return;
    if (!valid) {
      setShowErrors(true);
      const firstProblem = groups.find((group) => problems[group.id]);
      if (firstProblem) sheetRef.current?.querySelector(`#group-${firstProblem.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    onAdd(item, chosen, qty);
    onClose();
  }

  const offerPrice = item.offer?.discounted_price;

  return (
    <div className="item-sheet-layer">
      <button className="item-sheet-scrim" type="button" onClick={onClose} aria-label="Close" tabIndex={-1} />
      <div className="item-sheet" role="dialog" aria-modal="true" aria-labelledby={`item-sheet-title-${item.id}`} ref={sheetRef} tabIndex={-1}>
        <div className="item-sheet-head">
          {item.image_url ? <img src={item.image_url} alt="" width="640" height="420" /> : null}
          <div>
            <p className="eyebrow">{item.offer ? item.offer.badge_label : "Build your order"}</p>
            <h2 id={`item-sheet-title-${item.id}`}>{item.name}</h2>
            <p className="item-sheet-price">
              {offerPrice != null ? <><s>{formatPrice(toNumber(item.base_price) * priceFactor)}</s> {formatPrice(offerPrice * priceFactor)}</> : formatPrice(toNumber(item.base_price) * priceFactor)}
              {groups.some((group) => group.options.some((option) => toNumber(option.price_delta) > 0)) ? <small> base price</small> : null}
            </p>
            {item.description ? <p>{item.description}</p> : null}
            {item.dietary_tags?.length ? (
              <div className="menu-labels">{item.dietary_tags.map((tag) => <span key={tag}>{dietaryLabel(tag)}</span>)}</div>
            ) : null}
          </div>
          <button className="item-sheet-close" type="button" onClick={onClose} aria-label={`Close ${item.name}`}>Close</button>
        </div>

        <div className="item-sheet-body">
          {groups.map((group) => {
            const single = isSingle(group);
            const selection = selections[group.id];
            const count = single ? 0 : (selection as Set<number>)?.size || 0;
            const problem = showErrors ? problems[group.id] : null;
            return (
              <fieldset className={`item-group ${problem ? "has-error" : ""}`} key={group.id} id={`group-${group.id}`}>
                <legend>
                  <span>{group.name}</span>
                  <small className={group.required ? "is-required" : ""}>{groupHint(group)}</small>
                </legend>
                {problem ? <p className="field-error" role="alert">{problem}</p> : null}
                <div className="item-options">
                  {group.options.map((option) => {
                    const delta = formatDelta(toNumber(option.price_delta) * priceFactor);
                    if (single) {
                      return (
                        <label key={option.id} className={selection === option.id ? "is-selected" : ""}>
                          <input
                            type="radio"
                            name={`group-${group.id}`}
                            checked={selection === option.id}
                            onChange={() => {}}
                            onClick={() => chooseSingle(group, option.id)}
                            onKeyDown={(event) => {
                              if (!group.required && (event.key === "Backspace" || event.key === "Delete")) {
                                event.preventDefault();
                                chooseSingle(group, option.id);
                              }
                            }}
                          />
                          <span>{option.name}</span>
                          {delta ? <small>{delta}</small> : null}
                        </label>
                      );
                    }
                    const checked = (selection as Set<number>)?.has(option.id) || false;
                    const atMax = group.max_selections != null && count >= group.max_selections && !checked;
                    return (
                      <label key={option.id} className={`${checked ? "is-selected" : ""} ${atMax ? "is-disabled" : ""}`}>
                        <input type="checkbox" checked={checked} disabled={atMax} onChange={(event) => toggleMulti(group, option.id, event.target.checked)} />
                        <span>{option.name}</span>
                        {delta ? <small>{delta}</small> : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>

        <div className="item-sheet-foot">
          {outsideServiceWindow && storeOpen ? (
            <p className="item-sheet-note" role="status">
              {serviceWindowMessage ? `${serviceWindowMessage}. You can't add this right now.` : "This isn't being served right now."}
            </p>
          ) : null}
          {!storeOpen ? <p className="item-sheet-note" role="status">We&apos;re not taking online orders right now.</p> : null}
          <div className="item-sheet-actions">
            <div className="quantity-control" aria-label="Quantity">
              <button type="button" onClick={() => setQty((value) => Math.max(1, value - 1))} aria-label="Decrease quantity">−</button>
              <span aria-live="polite">{qty}</span>
              <button type="button" onClick={() => setQty((value) => Math.min(maxQuantity, value + 1))} disabled={qty >= maxQuantity} aria-label="Increase quantity">+</button>
            </div>
            <button className="button" type="button" onClick={add} disabled={!canAdd}>
              {!storeOpen ? "Ordering closed" : outsideServiceWindow ? "Not served right now" : `${addLabel} · ${formatMoney(unitPrice * qty * priceFactor)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
