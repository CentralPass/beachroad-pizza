"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, api, newRequestId } from "../lib/api";
import type { MenuCategory, MenuItem, ModifierOption } from "../lib/types";
import { useLiveMenu } from "../lib/useLiveMenu";
import { STORAGE_KEYS } from "../lib/venue";
import { ItemSheet } from "./ItemSheet";
import { MenuItemCard } from "./MenuItemCard";
import { useVenue } from "./providers/VenueProvider";

// The private table token lives in the URL fragment, so it never reaches
// server logs or analytics. It is read once, kept for the Stripe round trip,
// and stripped from the address bar.
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const money = (cents: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);

type TableLine = { menu_item_id: number; name: string; quantity: number; modifiers: Array<{ modifier_id: number; quantity: number; name: string }> };
type Pending = { items: Array<{ menu_item_id: number; quantity: number; modifiers: Array<{ modifier_id: number; quantity: number }> }>; name: string; notes: string; request_id: string; expected_total_cents: number; payment_method: "card" };
type Draft = { lines: TableLine[]; name: string; notes: string; pending: Pending | null };
type Context = {
  table?: { label: string; area?: string | null };
  accepting_orders: boolean;
  surcharge_percent?: number;
  policy?: { fee_bps?: number; max_order_cents?: number | null };
};
type TableQuote = { total_cents: number; offer_discount: number; fee_cents: number; surcharge_applied?: { amount: number } | null };
type Payment = { state: string; order_id?: number; total_cents?: number; can_resume?: boolean; table_label?: string; table_area?: string; url?: string };

const emptyDraft = (): Draft => ({ lines: [], name: "", notes: "", pending: null });

async function tableRequest<T>(path: string, body: unknown, signal?: AbortSignal) {
  return api.post<T>(`/api/table-ordering/${path}`, body, { signal });
}

function readToken() {
  if (window.location.hash) {
    const value = window.location.hash.slice(1);
    const token = TOKEN.test(value) ? value : "";
    try {
      if (token) window.sessionStorage.setItem(STORAGE_KEYS.tableToken, token);
      else window.sessionStorage.removeItem(STORAGE_KEYS.tableToken);
    } catch {
      // Checkout re-reads storage; without it the guest just rescans.
    }
    window.history.replaceState(null, "", window.location.pathname);
    return token;
  }
  try {
    return window.sessionStorage.getItem(STORAGE_KEYS.tableToken) || "";
  } catch {
    return "";
  }
}

export function TableOrder() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setToken(readToken()), 0);
    const onHash = () => setToken(readToken());
    window.addEventListener("hashchange", onHash);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  if (token === null) return <div className="shell table-page"><p role="status">Checking your table…</p></div>;
  if (!TOKEN.test(token)) {
    return (
      <div className="shell table-page">
        <section className="order-details table-gate">
          <p className="eyebrow">Order at your table</p>
          <h1>Scan the QR code on your table.</h1>
          <p>Use the QR sign on your table to start an order here. This page can&apos;t choose a different table.</p>
          <p className="checkout-note">No order has been placed and no payment has been taken.</p>
        </section>
      </div>
    );
  }
  return <TableSession key={token} token={token} />;
}

function initialDraft(key: string): Draft {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(key) || "null") as Draft | null;
    return saved && Array.isArray(saved.lines) ? saved : emptyDraft();
  } catch {
    return emptyDraft();
  }
}

function TableSession({ token }: { token: string }) {
  const venue = useVenue();
  const key = `${STORAGE_KEYS.tableCart}:${token}`;
  const [draft, setDraft] = useState<Draft>(() => initialDraft(key));
  const [context, setContext] = useState<Context | null>(null);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<{ key: string; value: TableQuote } | null>(null);
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<{ item: MenuItem; category: MenuCategory } | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const { menu } = useLiveMenu({ channel: "table" });

  const categories = useMemo(() => menu?.categories || [], [menu]);
  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return categories
      .map((category) => ({ ...category, items: category.items.filter((item) => `${item.name} ${item.description || ""}`.toLowerCase().includes(needle)) }))
      .filter((category) => category.items.length);
  }, [categories, search]);

  const items = useMemo(() => draft.lines.map((line) => ({
    menu_item_id: line.menu_item_id,
    quantity: line.quantity,
    modifiers: line.modifiers.map((modifier) => ({ modifier_id: modifier.modifier_id, quantity: modifier.quantity })),
  })), [draft.lines]);
  const cartKey = JSON.stringify(items);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(draft));
    } catch {
      // Checked explicitly before leaving for Stripe.
    }
  }, [key, draft]);

  useEffect(() => {
    let cancelled = false;
    tableRequest<Context>("context", { token })
      .then((value) => { if (!cancelled) setContext(value); })
      .catch((caught: Error) => { if (!cancelled) setError(caught.message); });
    return () => {
      cancelled = true;
    };
  }, [token, reload]);

  // Server-priced basket, debounced like the pickup cart.
  useEffect(() => {
    // No request: the keyed total below simply won't match an empty or pending basket.
    if (!items.length || draft.pending) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      tableRequest<TableQuote>("quote", { token, items }, controller.signal)
        .then((value) => setQuote({ key: cartKey, value }))
        .catch((caught: Error) => {
          if (caught.name !== "AbortError") {
            setQuote(null);
            setError(caught.message);
          }
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // cartKey captures items.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, cartKey, draft.pending, reload]);

  const terminal = ["paid", "refunded"].includes(payment?.state || "");
  useEffect(() => {
    if (!draft.pending || terminal) return;
    let active = true;
    const requestId = draft.pending.request_id;
    const check = () => tableRequest<Payment>("checkout-status", { request_id: requestId })
      .then((result) => {
        if (!active) return;
        setPayment(result);
        setError("");
        if (result.state === "paid") setDraft((current) => ({ ...current, lines: [] }));
      })
      .catch((caught: ApiError) => {
        if (!active) return;
        setError(caught.status === 404
          ? "Checkout hasn't been created yet. Retry using the same checkout below."
          : "We couldn't confirm payment yet. Don't pay again; check the status or ask staff.");
      });
    void check();
    const timer = window.setInterval(check, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [draft.pending, reload, terminal]);

  async function act(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (caught) {
      setError((caught as Error).message || "Couldn't complete that. Please ask staff.");
    } finally {
      setBusy(false);
    }
  }

  function go(result: Payment) {
    if (result.url) {
      const url = new URL(result.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Invalid payment link. Please ask staff.");
      window.location.assign(url.href);
    } else {
      setPayment(result);
    }
  }

  async function createPending(pending: Pending) {
    try {
      return await tableRequest<Payment>("checkout", { token, ...pending });
    } catch (caught) {
      const failure = caught as ApiError;
      if ([400, 404, 409, 429].includes(failure.status)) {
        try {
          await tableRequest("checkout-status", { request_id: pending.request_id });
        } catch (lookup) {
          if ((lookup as ApiError).status === 404) {
            setDraft((current) => ({ ...current, pending: null }));
            setPayment(null);
            setQuote(null);
            setReload((value) => value + 1);
          }
        }
      }
      throw caught;
    }
  }

  const checkout = () => act(async () => {
    if (!draft.name.trim()) throw new Error("Enter your name so staff can find your order.");
    if (!quote || quote.key !== cartKey) throw new Error("Wait a moment for the updated total.");
    const pending: Pending = {
      items,
      name: draft.name.trim(),
      notes: draft.notes.trim(),
      request_id: newRequestId(),
      expected_total_cents: quote.value.total_cents,
      payment_method: "card",
    };
    const next = { ...draft, pending };
    // Never leave for Stripe without a recoverable checkout ID.
    try {
      const saved = JSON.stringify(next);
      window.sessionStorage.setItem(key, saved);
      if (window.sessionStorage.getItem(key) !== saved) throw new Error("Storage unavailable");
    } catch {
      throw new Error("This browser can't safely remember your checkout, so no payment was started. Open the QR in Safari or Chrome, or ask staff.");
    }
    setDraft(next);
    go(await createPending(pending));
  });

  const retry = () => act(async () => {
    if (!draft.pending) return;
    go(payment?.can_resume
      ? await tableRequest<Payment>("resume-checkout", { request_id: draft.pending.request_id })
      : await createPending(draft.pending));
  });

  const closeCheckout = () => act(async () => {
    if (!draft.pending) return;
    if (!window.confirm("Close this unpaid checkout? Any completed payment will be reconciled before you order again.")) return;
    try {
      setPayment(await tableRequest<Payment>("cancel-checkout", { request_id: draft.pending.request_id, confirm: true }));
    } catch (caught) {
      if ((caught as ApiError).status === 404) {
        setDraft((current) => ({ ...current, pending: null }));
        setPayment(null);
      } else {
        throw caught;
      }
    }
  });

  const newOrder = () => {
    setDraft({ ...emptyDraft(), name: draft.name });
    setPayment(null);
    setQuote(null);
    setReload((value) => value + 1);
  };

  const factor = (1 + Number(context?.surcharge_percent || 0) / 100) * (1 + Number(context?.policy?.fee_bps || 0) / 10000);
  const total = quote?.key === cartKey ? quote.value : null;
  const itemCount = draft.lines.reduce((sum, line) => sum + line.quantity, 0);
  const overLimit = Boolean(context?.policy?.max_order_cents && total && total.total_cents > context.policy.max_order_cents);

  function addLine(item: MenuItem, modifiers: ModifierOption[], qty: number) {
    if (qty > 20 || draft.lines.length >= 50 || itemCount + qty > 100) {
      setError("Choose up to 20 of each item and 100 items per order. Ask staff for bigger orders.");
      return;
    }
    setError("");
    setDraft((current) => ({
      ...current,
      lines: [...current.lines, { menu_item_id: item.id, name: item.name, quantity: qty, modifiers: modifiers.map((modifier) => ({ modifier_id: modifier.id, quantity: 1, name: modifier.name })) }],
    }));
  }

  const header = (
    <header className="table-head">
      <div>
        <p className="eyebrow">Order at your table</p>
        <h1>{payment?.table_label || context?.table?.label || "Checking your table…"}</h1>
        {payment?.table_area || context?.table?.area ? <p>{payment?.table_area || context?.table?.area}</p> : null}
      </div>
      <span className="tracking-badge">Card only</span>
    </header>
  );

  const errorBanner = error ? (
    <div className="order-notice order-notice-alert" role="alert">
      {error}{" "}
      <button className="text-button" type="button" onClick={() => { setError(""); setReload((value) => value + 1); }}>Check again</button>
    </div>
  ) : null;

  if (draft.pending) {
    const state = payment?.state;
    return (
      <div className="shell table-page">
        {header}
        {errorBanner}
        <section className="order-review">
          <h2>
            {state === "paid" ? "Paid. Your order is with the team."
              : state === "refunded" ? "Payment refunded."
                : state === "refund_pending" ? "Full refund requested."
                  : state === "expired" ? "Checkout closed."
                    : state === "review" ? "Payment needs a staff check."
                      : "Confirming your checkout…"}
          </h2>
          {payment?.order_id ? <p>Order #{payment.order_id}{payment.total_cents != null ? ` · ${money(payment.total_cents)}` : ""}</p> : null}
          {state === "paid" ? <p>Stay at your table. Staff will review and prepare your order. Talk to staff for any changes.</p> : null}
          {state === "refund_pending" ? <p>Your order won&apos;t be prepared. The full amount, including any card surcharge, is being refunded to your card.</p> : null}
          {state === "review" ? <p>Please ask staff before paying again. They can check the payment for you.</p> : null}
          {!payment || payment.can_resume ? (
            <div className="order-review-actions">
              <button className="button" type="button" disabled={busy} onClick={retry}>Continue card checkout</button>
              <button className="button button-secondary" type="button" disabled={busy} onClick={closeCheckout}>Close unpaid checkout</button>
            </div>
          ) : null}
          {["paid", "refunded", "expired"].includes(state || "") ? <button className="button" type="button" onClick={newOrder}>Start a new order</button> : null}
          <p className="checkout-note">Not sure whether payment went through? Ask staff rather than paying again.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="shell table-page">
      {header}
      {errorBanner}
      {!context ? <p role="status">Checking your private table link…</p> : (
        <>
          {!context.accepting_orders ? <p className="order-notice order-notice-alert"><strong>Table ordering is paused.</strong> Please order with a staff member.</p> : null}
          {factor > 1 ? (
            <p className="order-notice">
              Prices shown include
              {context.policy?.fee_bps ? ` a ${context.policy.fee_bps / 100}% card surcharge` : ""}
              {context.policy?.fee_bps && context.surcharge_percent ? " and" : ""}
              {context.surcharge_percent ? ` a ${context.surcharge_percent}% venue surcharge` : ""}. Offers may reduce your total.
            </p>
          ) : null}
          <div className="table-layout">
            <div>
              <label className="menu-search-wrap">
                <span>Search the menu</span>
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find something tasty" />
              </label>
              {shown.map((category) => (
                <section key={category.id} className="order-category">
                  <div className="order-category-head">
                    <h3>{category.name}</h3>
                    {category.available_now === false && category.availability_message ? <p className="menu-window-note">{category.availability_message}</p> : null}
                  </div>
                  <div className="menu-list">
                    {category.items.map((item) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        priceFactor={factor}
                        unavailable={!context.accepting_orders || category.available_now === false}
                        unavailableNote={category.availability_message}
                        onChoose={(picked) => setChosen({ item: picked, category })}
                      />
                    ))}
                  </div>
                </section>
              ))}
              {!categories.length ? <p role="status">Loading the menu…</p> : null}
              {categories.length > 0 && !shown.length ? <p>Nothing matches that search.</p> : null}
            </div>

            <aside className="order-total-card table-basket" id="table-basket">
              <p className="eyebrow">Your order · {context.table?.label}</p>
              {!draft.lines.length ? <p>Your basket is empty. Choose something from the menu.</p> : null}
              {draft.lines.map((line, index) => (
                <div className="summary-line" key={`${line.menu_item_id}-${index}`}>
                  <div>
                    <strong>{line.quantity} × {line.name}</strong>
                    {line.modifiers.length ? <small>{line.modifiers.map((modifier) => modifier.name).join(", ")}</small> : null}
                    <div className="quantity-control">
                      <button type="button" aria-label={`Fewer ${line.name}`} disabled={line.quantity <= 1} onClick={() => setDraft((current) => ({ ...current, lines: current.lines.map((entry, position) => position === index ? { ...entry, quantity: entry.quantity - 1 } : entry) }))}>−</button>
                      <span aria-live="polite">{line.quantity}</span>
                      <button type="button" aria-label={`More ${line.name}`} disabled={line.quantity >= 20 || itemCount >= 100} onClick={() => setDraft((current) => ({ ...current, lines: current.lines.map((entry, position) => position === index ? { ...entry, quantity: entry.quantity + 1 } : entry) }))}>+</button>
                    </div>
                  </div>
                  <button className="text-button" type="button" onClick={() => setDraft((current) => ({ ...current, lines: current.lines.filter((_, position) => position !== index) }))}>Remove</button>
                </div>
              ))}
              {draft.lines.length ? (
                <>
                  <label className="order-notes">Your name<input required maxLength={80} autoComplete="given-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
                  <label className="order-notes">Notes for staff<textarea rows={2} maxLength={500} value={draft.notes} placeholder="Requests or dietary info" onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
                  <p>For allergies, talk to staff before ordering.</p>
                  {total ? (
                    <>
                      <div><span>Items{factor > 1 ? " (incl. surcharge)" : ""}</span><strong>{money(total.total_cents + Math.round(total.offer_discount * 100))}</strong></div>
                      {total.offer_discount > 0 ? <div className="total-saving"><span>Offer</span><strong>−{money(Math.round(total.offer_discount * 100))}</strong></div> : null}
                      <div className="order-grand-total"><span>Total</span><strong>{money(total.total_cents)}</strong></div>
                      {overLimit ? <p className="order-notice order-notice-alert" role="alert">This order is over the {money(context.policy!.max_order_cents!)} table limit. Remove something or ask staff.</p> : null}
                    </>
                  ) : <p role="status">Checking your total…</p>}
                  <button className="button" type="button" disabled={busy || !total || !context.accepting_orders || !draft.name.trim() || overLimit} onClick={checkout}>
                    {busy ? "Opening secure checkout…" : `Pay by card${total ? ` · ${money(total.total_cents)}` : ""}`}
                  </button>
                  <p>Payment is taken now. Staff may refund in full if they can&apos;t make your order.</p>
                </>
              ) : null}
            </aside>
          </div>
          <p className="allergen-note">
            <strong>Allergens:</strong> our kitchen handles gluten, dairy, eggs, nuts, soy, seafood and sesame, so we can&apos;t guarantee any item is free from traces. Please talk to staff about allergies before ordering.
          </p>
        </>
      )}
      <p className="checkout-note">Fixed to your table at {venue.name}. Need help? Ask a staff member.</p>

      {chosen ? (
        <ItemSheet
          item={chosen.item}
          storeOpen={Boolean(context?.accepting_orders)}
          outsideServiceWindow={chosen.category.available_now === false}
          serviceWindowMessage={chosen.category.availability_message}
          priceFactor={factor}
          maxQuantity={Math.max(1, Math.min(20, 100 - itemCount))}
          addLabel="Add"
          onAdd={addLine}
          onClose={() => setChosen(null)}
        />
      ) : null}
    </div>
  );
}
