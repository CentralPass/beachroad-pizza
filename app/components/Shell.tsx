import type { ReactNode } from "react";
import Link from "next/link";
import { BUSINESS } from "../lib/site-data";
import { StoreStatus } from "./StoreStatus";
import { CartCount } from "./CartProvider";
import { SiteNotice } from "./SiteNotice";
import { Chrome } from "./Chrome";
import { BookingsNavLink, HoursRows, TodayNote, VenuePhoneLink } from "./VenueBits";

const nav = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/our-story", label: "Our story" },
  { href: "/enquire", label: "Enquire" },
];

export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <Chrome>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="service-bar">
        <div className="shell service-bar-inner">
          <StoreStatus />
          <VenuePhoneLink />
          <span>Order pickup online · delivery on Uber Eats and DoorDash</span>
        </div>
      </div>
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="wordmark" href="/" aria-label="Beach Road Pizza home">
            <img
              className="header-logo"
              src="/brand/beach-road-pizza-logo-v1.png"
              alt="Beach Road Pizza"
              width="1433"
              height="1098"
            />
          </Link>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {nav.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
            <BookingsNavLink />
          </nav>
          <a className="button button-small header-order-button" href={BUSINESS.orderUrl}>
            <span className="order-label-full">Order online</span>
            <span className="order-label-short">Order</span>
            <CartCount />
          </a>
          <details className="mobile-menu">
            <summary aria-label="Open website menu">Menu</summary>
            <nav aria-label="Mobile navigation">
              {nav.map((item) => (
                <a key={item.href} href={item.href}>
                  {item.label}
                </a>
              ))}
              <BookingsNavLink />
              <a href={BUSINESS.orderUrl}>
                Order online <CartCount />
              </a>
            </nav>
          </details>
        </div>
      </header>
      <SiteNotice />
      </Chrome>
      <main id="main-content">{children}</main>
      <Chrome>
      <footer className="site-footer">
        <div className="shell footer-main">
          <div className="footer-brand">
            <img
              className="footer-logo"
              src="/brand/beach-road-pizza-logo-v1.png"
              alt=""
              width="1433"
              height="1098"
            />
            <div>
              <p className="footer-kicker">Beach Road Pizza</p>
              <h2>Great pizzas, great prices, for a great community.</h2>
            </div>
          </div>
          <div className="footer-actions">
            <VenuePhoneLink />
            <a href={BUSINESS.mapsUrl} target="_blank" rel="noreferrer">Directions</a>
            <a href="/order">Order online</a>
            {nav.slice(1).map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
            <BookingsNavLink />
            <a href="/connect">Deals by email</a>
          </div>
        </div>
        <div className="shell footer-meta">
          <details>
            <summary>Opening hours</summary>
            <div>
              <HoursRows variant="footer" />
              <TodayNote />
              <small>Public holiday hours may differ. Call to confirm.</small>
            </div>
          </details>
          <a href="/privacy">Privacy</a>
        </div>
        <div className="shell footer-bottom">
          <span>© {new Date().getFullYear()} Beach Road Pizza</span>
          <span>Christies Beach, South Australia</span>
        </div>
      </footer>
      </Chrome>
    </>
  );
}
