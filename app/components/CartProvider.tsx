"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiError, api } from "../lib/api";
import { formatDelta, formatMoney, toNumber } from "../lib/format";
import type { DiscountCode, MenuItem, ModifierOption, Quote } from "../lib/types";
import { useDialog } from "../lib/useDialog";
import { STORAGE_KEYS } from "../lib/venue";
import { useStoreStatus } from "./providers/StoreStatusProvider";

export type CartModifier = { id: number; name: string; price_delta: number };

export type CartLine = {
  id: string;
  item: { id: number; name: string; base_price: number; image_url: string | null };
  modifiers: CartModifier[];
  qty: number;
};

type QuoteStatus = "idle" | "loading" | "ready" | "error";

type QuoteState = {
  // The cart (items + code) this result was priced for.
  key: string | null;
  quote: Quote | null;
  failed: boolean;
  // A problem with the cart itself (an item no longer sold, a code that
  // expired). Blocks checkout until the customer fixes it.
  blocking: string | null;
};

type CartContextValue = {
  // False until the saved cart has been read back from session storage.
  hydrated: boolean;
  lines: CartLine[];
  count: number;
  subtotal: number;
  total: number;
  quote: Quote | null;
  quoteStatus: QuoteStatus;
  quoteProblem: string | null;
  discountCode: string | null;
  discountData: DiscountCode | null;
  isOpen: boolean;
  addItem: (item: MenuItem, modifiers: ModifierOption[], qty?: number) => void;
  changeQuantity: (id: string, qty: number) => void;
  removeLine: (id: string) => void;
  removeMenuItem: (itemId: number) => string[];
  clearCart: () => void;
  setDiscount: (code: string, data: DiscountCode) => void;
  clearDiscount: () => void;
  orderItems: () => Array<{ menu_item_id: number; quantity: number; modifiers: Array<{ modifier_id: number; quantity: number }> }>;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const QUOTE_DEBOUNCE_MS = 250;

function lineId(itemId: number, modifiers: CartModifier[]) {
  return `${itemId}::${modifiers.map((modifier) => modifier.id).sort((a, b) => a - b).join(",")}`;
}

export function lineUnitPrice(line: CartLine) {
  return line.item.base_price + line.modifiers.reduce((sum, modifier) => sum + modifier.price_delta, 0);
}

type Persisted = { lines: CartLine[]; discountCode: string | null; discountData: DiscountCode | null };

function readPersisted(): Persisted | null {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEYS.cart);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Persisted;
    return Array.isArray(parsed.lines) ? parsed : null;
  } catch {
    return null;
  }
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}

/**
 * The cart is a draft; the price is the server's. Lines persist for the browser
 * session, but the quote never does: prices, offers and surcharges can change,
 * so a restored cart is re-quoted immediately. One debounced subscriber here
 * prices the whole site, and a sequence number drops out-of-order replies so
 * tapping "+" quickly can never leave an old total on screen.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [discountData, setDiscountData] = useState<DiscountCode | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [quoteState, setQuoteState] = useState<QuoteState>({ key: null, quote: null, failed: false, blocking: null });
  const sequence = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const persisted = readPersisted();
      if (persisted) {
        setLines(persisted.lines);
        setDiscountCode(persisted.discountCode);
        setDiscountData(persisted.discountData);
      }
      // The old static-menu cart used names instead of menu IDs and cannot be priced.
      try {
        window.localStorage.removeItem(STORAGE_KEYS.legacyCart);
      } catch {
        // Storage blocked; nothing to clean up.
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEYS.cart, JSON.stringify({ lines, discountCode, discountData }));
    } catch {
      // Private browsing can refuse storage; the cart still works for this page.
    }
  }, [lines, discountCode, discountData, loaded]);

  const orderItems = useCallback(() => lines.map((line) => ({
    menu_item_id: line.item.id,
    quantity: line.qty,
    modifiers: line.modifiers.map((modifier) => ({ modifier_id: modifier.id, quantity: 1 })),
  })), [lines]);

  const cartKey = useMemo(() => JSON.stringify([orderItems(), discountCode]), [orderItems, discountCode]);

  useEffect(() => {
    if (!loaded || !lines.length) return;
    sequence.current += 1;
    const seq = sequence.current;
    const key = cartKey;
    const timer = window.setTimeout(() => {
      api.post<Quote>("/api/orders/quote", { items: orderItems(), discount_code: discountCode || undefined })
        .then((quote) => {
          if (sequence.current === seq) setQuoteState({ key, quote, failed: false, blocking: null });
        })
        .catch((error: ApiError) => {
          if (sequence.current !== seq) return;
          // 4xx means the cart itself needs changing; anything else is a
          // transient failure, so keep the last good quote on screen.
          const blocking = error.status >= 400 && error.status < 500 ? error.message : null;
          setQuoteState((current) => ({ ...current, key, failed: true, blocking }));
        });
    }, QUOTE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [cartKey, lines.length, discountCode, loaded, orderItems]);

  const quoteStatus: QuoteStatus = !lines.length
    ? "idle"
    : quoteState.key !== cartKey ? "loading" : quoteState.failed ? "error" : "ready";
  const currentQuote = lines.length ? quoteState.quote : null;
  const quoteProblem = lines.length && quoteState.key === cartKey ? quoteState.blocking : null;

  const addItem = useCallback((item: MenuItem, modifiers: ModifierOption[], qty = 1) => {
    const cartModifiers = modifiers.map((modifier) => ({
      id: modifier.id,
      name: modifier.name,
      price_delta: toNumber(modifier.price_delta),
    }));
    const id = lineId(item.id, cartModifiers);
    setLines((current) => {
      const existing = current.find((line) => line.id === id);
      if (existing) return current.map((line) => (line.id === id ? { ...line, qty: Math.min(99, line.qty + qty) } : line));
      return [
        ...current,
        {
          id,
          item: { id: item.id, name: item.name, base_price: toNumber(item.base_price), image_url: item.image_url },
          modifiers: cartModifiers,
          qty,
        },
      ];
    });
    setIsOpen(true);
  }, []);

  const changeQuantity = useCallback((id: string, qty: number) => {
    setLines((current) => (qty <= 0
      ? current.filter((line) => line.id !== id)
      : current.map((line) => (line.id === id ? { ...line, qty: Math.min(99, qty) } : line))));
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((current) => current.filter((line) => line.id !== id));
  }, []);

  const linesRef = useRef(lines);
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  const removeMenuItem = useCallback((itemId: number) => {
    const removed = linesRef.current.filter((line) => line.item.id === itemId).map((line) => line.item.name);
    if (removed.length) setLines((current) => current.filter((line) => line.item.id !== itemId));
    return removed;
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
    setDiscountCode(null);
    setDiscountData(null);
    setQuoteState({ key: null, quote: null, failed: false, blocking: null });
  }, []);

  const setDiscount = useCallback((code: string, data: DiscountCode) => {
    setDiscountCode(code);
    setDiscountData(data);
  }, []);

  const clearDiscount = useCallback(() => {
    setDiscountCode(null);
    setDiscountData(null);
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + lineUnitPrice(line) * line.qty, 0), [lines]);

  const value = useMemo<CartContextValue>(() => ({
    hydrated: loaded,
    lines,
    count: lines.reduce((sum, line) => sum + line.qty, 0),
    subtotal,
    total: currentQuote ? currentQuote.total : subtotal,
    quote: currentQuote,
    quoteStatus,
    quoteProblem,
    discountCode,
    discountData,
    isOpen,
    addItem,
    changeQuantity,
    removeLine,
    removeMenuItem,
    clearCart,
    setDiscount,
    clearDiscount,
    orderItems,
    openCart,
    closeCart,
  }), [loaded, lines, subtotal, currentQuote, quoteStatus, quoteProblem, discountCode, discountData, isOpen, addItem, changeQuantity, removeLine, removeMenuItem, clearCart, setDiscount, clearDiscount, orderItems, openCart, closeCart]);

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
      <CartDock />
    </CartContext.Provider>
  );
}

export function CartCount() {
  const { count } = useCart();
  return count ? <span className="cart-count" aria-label={`${count} items in cart`}>{count}</span> : null;
}

export function QuantityControl({ line }: { line: CartLine }) {
  const { changeQuantity } = useCart();
  return (
    <div className="quantity-control" aria-label={`Quantity for ${line.item.name}`}>
      <button type="button" onClick={() => changeQuantity(line.id, line.qty - 1)} aria-label={`Remove one ${line.item.name}`}>−</button>
      <span aria-live="polite">{line.qty}</span>
      <button type="button" onClick={() => changeQuantity(line.id, line.qty + 1)} aria-label={`Add one ${line.item.name}`} disabled={line.qty >= 99}>+</button>
    </div>
  );
}

export function ModifierList({ modifiers }: { modifiers: CartModifier[] }) {
  if (!modifiers.length) return null;
  return (
    <span className="line-modifiers">
      {modifiers.map((modifier) => (
        <span key={modifier.id}>
          {modifier.name}
          {modifier.price_delta ? ` (${formatDelta(modifier.price_delta)})` : ""}
        </span>
      ))}
    </span>
  );
}

/** Free units from a buy-one-get-one offer, keyed by cart position. */
export function useFreeUnits(quote: Quote | null) {
  return useMemo(() => new Map((quote?.offer_applied?.free_units || []).map((unit) => [unit.line_index, unit])), [quote]);
}

export function LinePrice({ line, index, quote }: { line: CartLine; index: number; quote: Quote | null }) {
  const freeUnits = useFreeUnits(quote);
  const lineTotal = lineUnitPrice(line) * line.qty;
  const free = freeUnits.get(index);
  const saved = free ? free.quantity * toNumber(free.unit_price) : 0;
  if (saved > 0) {
    return (
      <strong className="line-price">
        <s>{formatMoney(lineTotal)}</s> {formatMoney(lineTotal - saved)}
      </strong>
    );
  }
  return <strong className="line-price">{formatMoney(lineTotal)}</strong>;
}

/** Everything below the subtotal is exactly what the server last quoted. */
export function QuoteRows({ quote, subtotal, discountCode }: { quote: Quote | null; subtotal: number; discountCode: string | null }) {
  const offer = quote?.offer_applied;
  const surcharge = quote?.surcharge_applied;
  return (
    <>
      <div><span>Subtotal</span><strong>{formatMoney(quote ? quote.subtotal : subtotal)}</strong></div>
      {offer && quote && quote.offer_discount > 0 ? (
        <div className="total-saving"><span>{offer.badge_label}</span><strong>−{formatMoney(quote.offer_discount)}</strong></div>
      ) : null}
      {quote && quote.discount_amount > 0 ? (
        <div className="total-saving"><span>Discount{discountCode ? ` (${discountCode})` : ""}</span><strong>−{formatMoney(quote.discount_amount)}</strong></div>
      ) : null}
      {surcharge && toNumber(surcharge.amount) > 0 ? (
        <div><span>{surcharge.label || `Public holiday surcharge (${surcharge.percent}%)`}</span><strong>+{formatMoney(surcharge.amount)}</strong></div>
      ) : null}
    </>
  );
}

export function PromoCodeField() {
  const fieldId = useId();
  const { subtotal, discountCode, discountData, setDiscount, clearDiscount } = useCart();
  const [input, setInput] = useState(discountCode || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function apply() {
    const code = input.trim();
    if (!code) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.post<{ valid: boolean; reason?: string; code?: DiscountCode }>(
        "/api/orders/discount/validate",
        { code, subtotal },
      );
      if (!result.valid || !result.code) {
        setError(result.reason || "That code isn't valid.");
        clearDiscount();
        return;
      }
      setDiscount(code.toUpperCase(), result.code);
      setInput(code.toUpperCase());
    } catch (caught) {
      setError((caught as Error).message || "That code isn't valid.");
      clearDiscount();
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    clearDiscount();
    setInput("");
    setError("");
  }

  return (
    <div className="promo-field">
      <label htmlFor={fieldId}>Promo code</label>
      <div>
        <input
          id={fieldId}
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void apply();
            }
          }}
          autoComplete="off"
          autoCapitalize="characters"
          disabled={Boolean(discountData)}
          aria-describedby={error ? `${fieldId}-error` : undefined}
        />
        <button type="button" onClick={discountData ? remove : apply} disabled={busy || (!discountData && !input.trim())}>
          {discountData ? "Remove" : busy ? "Checking" : "Apply"}
        </button>
      </div>
      {error ? <p className="field-error" id={`${fieldId}-error`}>{error}</p> : null}
      {discountData ? (
        <p className="field-success">
          “{discountCode}” applied: {discountData.type === "percent"
            ? `${toNumber(discountData.value)}% off`
            : `${formatMoney(discountData.value)} off`}
        </p>
      ) : null}
    </div>
  );
}

function CartDrawer() {
  const router = useRouter();
  const { lines, subtotal, total, quote, quoteStatus, quoteProblem, discountCode, isOpen, closeCart, removeLine } = useCart();
  const { ordersPaused, acceptingOrders } = useStoreStatus();
  const drawerRef = useRef<HTMLElement>(null);
  useDialog(drawerRef, isOpen, closeCart);

  const blocked = ordersPaused || acceptingOrders === false || Boolean(quoteProblem);

  return (
    <>
      <button className={`cart-scrim ${isOpen ? "is-open" : ""}`} type="button" onClick={closeCart} aria-label="Close cart" tabIndex={-1} />
      <aside
        ref={drawerRef}
        className={`cart-drawer ${isOpen ? "is-open" : ""}`}
        aria-hidden={!isOpen}
        inert={!isOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Your Beach Road Pizza order"
        tabIndex={-1}
      >
        <div className="cart-drawer-head">
          <div>
            <p className="eyebrow">Your order</p>
            <h2>Cart</h2>
          </div>
          <button type="button" onClick={closeCart} aria-label="Close cart">Close</button>
        </div>
        <div className="cart-drawer-body">
          {lines.length ? lines.map((line, index) => (
            <article className="cart-line" key={line.id}>
              {line.item.image_url
                ? <img src={line.item.image_url} alt="" width="120" height="90" />
                : <span className="cart-line-placeholder" aria-hidden="true">BRP</span>}
              <div>
                <strong>{line.item.name}</strong>
                <ModifierList modifiers={line.modifiers} />
                <LinePrice line={line} index={index} quote={quote} />
                <QuantityControl line={line} />
              </div>
              <button className="cart-remove" type="button" onClick={() => removeLine(line.id)}>Remove</button>
            </article>
          )) : (
            <div className="cart-empty">
              <h3>Your cart is ready for a favourite.</h3>
              <p>Add pizzas, sides, schnitzels, pasta or drinks from the menu.</p>
            </div>
          )}
          {lines.length ? <PromoCodeField /> : null}
        </div>
        <div className="cart-drawer-foot">
          {lines.length ? (
            <>
              <div className="cart-totals">
                <QuoteRows quote={quote} subtotal={subtotal} discountCode={discountCode} />
                <div className="cart-grand-total"><span>Total</span><strong>{formatMoney(total)}</strong></div>
              </div>
              <small aria-live="polite">
                {quoteProblem
                  ? quoteProblem
                  : quoteStatus === "loading"
                    ? "Updating your total…"
                    : quoteStatus === "error"
                      ? "We couldn't refresh your total. It will be confirmed at checkout."
                      : "Pickup from the shop. Total includes GST."}
              </small>
              {ordersPaused ? <p className="cart-notice" role="status">Online orders are paused right now. Please check back shortly.</p> : null}
              {!ordersPaused && acceptingOrders === false ? <p className="cart-notice" role="status">We&apos;re closed right now. You can order when the shop opens.</p> : null}
              <button
                className="button"
                type="button"
                disabled={blocked}
                onClick={() => {
                  closeCart();
                  router.push("/checkout");
                }}
              >
                Checkout
              </button>
            </>
          ) : null}
          <a className="text-link" href="/order" onClick={closeCart}>{lines.length ? "Keep browsing" : "Start an order"}</a>
        </div>
      </aside>
    </>
  );
}

const DOCK_HIDDEN = ["/checkout", "/track", "/table", "/bookings/manage"];

function CartDock() {
  const pathname = usePathname() || "/";
  const { count, total, openCart } = useCart();
  if (!count || DOCK_HIDDEN.some((prefix) => pathname.startsWith(prefix))) return null;
  return (
    <button className="cart-dock" type="button" onClick={openCart}>
      <span>View cart · {count} {count === 1 ? "item" : "items"}</span>
      <strong>{formatMoney(total)}</strong>
    </button>
  );
}
