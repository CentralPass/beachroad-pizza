"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { MenuItem } from "../lib/site-data";

export type MenuOption = {
  label: string;
  price: number;
};

export type CartItem = {
  id: string;
  name: string;
  option: string;
  unitPrice: number;
  quantity: number;
  image?: string;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  addItem: (item: MenuItem, option: MenuOption) => void;
  changeQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "beach-road-pizza-cart-v1";

export function formatPrice(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function menuOptions(item: MenuItem): MenuOption[] {
  if (item.sizes) {
    const options = item.sizes
      .split("|")
      .map((part) => part.trim())
      .map((part) => {
        const match = part.match(/^(.*?)\s+\$([0-9]+(?:\.[0-9]+)?)/);
        return match ? { label: match[1].trim(), price: Number(match[2]) } : null;
      })
      .filter((option): option is MenuOption => Boolean(option));

    if (options.length) return options;
  }

  const price = item.price.match(/\$([0-9]+(?:\.[0-9]+)?)/);
  const size = item.price.match(/\b(small|large|family|party)\b/i);
  return [{ label: size ? size[1][0].toUpperCase() + size[1].slice(1).toLowerCase() : "Standard", price: price ? Number(price[1]) : 0 }];
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) setItems(JSON.parse(stored) as CartItem[]);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  function addItem(item: MenuItem, option: MenuOption) {
    const id = `${item.category}:${item.name}:${option.label}`;
    setItems((current) => {
      const existing = current.find((entry) => entry.id === id);
      if (existing) {
        return current.map((entry) => entry.id === id ? { ...entry, quantity: entry.quantity + 1 } : entry);
      }
      return [...current, { id, name: item.name, option: option.label, unitPrice: option.price, quantity: 1, image: item.image }];
    });
    setIsOpen(true);
  }

  function changeQuantity(id: string, quantity: number) {
    if (quantity <= 0) {
      setItems((current) => current.filter((entry) => entry.id !== id));
      return;
    }
    setItems((current) => current.map((entry) => entry.id === id ? { ...entry, quantity } : entry));
  }

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
    isOpen,
    addItem,
    changeQuantity,
    removeItem: (id) => setItems((current) => current.filter((entry) => entry.id !== id)),
    clearCart: () => setItems([]),
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
  }), [items, isOpen]);

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

function QuantityControl({ item }: { item: CartItem }) {
  const { changeQuantity } = useCart();
  return (
    <div className="quantity-control" aria-label={`Quantity for ${item.name}`}>
      <button type="button" onClick={() => changeQuantity(item.id, item.quantity - 1)} aria-label={`Remove one ${item.name}`}>−</button>
      <span>{item.quantity}</span>
      <button type="button" onClick={() => changeQuantity(item.id, item.quantity + 1)} aria-label={`Add one ${item.name}`}>+</button>
    </div>
  );
}

function CartDrawer() {
  const { items, subtotal, isOpen, closeCart, removeItem } = useCart();
  return (
    <>
      <button className={`cart-scrim ${isOpen ? "is-open" : ""}`} type="button" onClick={closeCart} aria-label="Close cart" tabIndex={isOpen ? 0 : -1} />
      <aside className={`cart-drawer ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen} aria-label="Your Beach Road Pizza order">
        <div className="cart-drawer-head">
          <div>
            <p className="eyebrow">Your order</p>
            <h2>Cart</h2>
          </div>
          <button type="button" onClick={closeCart} aria-label="Close cart">Close</button>
        </div>
        <div className="cart-drawer-body">
          {items.length ? items.map((item) => (
            <article className="cart-line" key={item.id}>
              {item.image ? <img src={item.image} alt="" width="120" height="90" /> : <span className="cart-line-placeholder" aria-hidden="true">BRP</span>}
              <div>
                <strong>{item.name}</strong>
                <small>{item.option} · {formatPrice(item.unitPrice)}</small>
                <QuantityControl item={item} />
              </div>
              <button className="cart-remove" type="button" onClick={() => removeItem(item.id)}>Remove</button>
            </article>
          )) : (
            <div className="cart-empty">
              <h3>Your cart is ready for a favourite.</h3>
              <p>Add pizzas, sides, schnitzels, pasta or drinks from the menu.</p>
            </div>
          )}
        </div>
        <div className="cart-drawer-foot">
          <div><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
          <small>Delivery and extras are calculated during order review.</small>
          <a className="button" href="/order" onClick={closeCart}>Review order</a>
          <a className="text-link" href="/menu" onClick={closeCart}>Keep browsing</a>
        </div>
      </aside>
    </>
  );
}

function CartDock() {
  const { count, subtotal, openCart } = useCart();
  if (!count) return null;
  return (
    <button className="cart-dock" type="button" onClick={openCart}>
      <span>View cart · {count} {count === 1 ? "item" : "items"}</span>
      <strong>{formatPrice(subtotal)}</strong>
    </button>
  );
}
