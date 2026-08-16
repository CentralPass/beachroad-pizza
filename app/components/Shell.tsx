import type { ReactNode } from "react";
import { BUSINESS, HOURS } from "../lib/site-data";
import { CursorToggle } from "./CursorToggle";
import { StoreStatus } from "./StoreStatus";

const nav = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/catering", label: "Catering" },
  { href: "/our-story", label: "Our story" },
  { href: "/enquire", label: "Enquire" },
];

export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="service-bar">
        <div className="shell service-bar-inner">
          <StoreStatus />
          <a href={BUSINESS.phoneHref}>Call {BUSINESS.phoneDisplay}</a>
          <span>Christies Beach pickup and delivery</span>
        </div>
      </div>
      <header className="site-header">
        <div className="shell header-inner">
          <a className="wordmark" href="/" aria-label="Beach Road Pizza home">
            <strong>Beach Road</strong>
            <span>Pizza</span>
          </a>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {nav.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <a className="button button-small" href={BUSINESS.orderUrl} target="_blank" rel="noreferrer">
            Order online
          </a>
          <details className="mobile-menu">
            <summary aria-label="Open website menu">Menu</summary>
            <nav aria-label="Mobile navigation">
              {nav.map((item) => (
                <a key={item.href} href={item.href}>
                  {item.label}
                </a>
              ))}
              <a href={BUSINESS.orderUrl} target="_blank" rel="noreferrer">
                Order online
              </a>
            </nav>
          </details>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="site-footer">
        <div className="shell footer-main">
          <div className="footer-brand">
            <p className="footer-kicker">Beach Road Pizza</p>
            <h2>Great pizzas, great prices, for a great community.</h2>
          </div>
          <div className="footer-actions">
            <a href={BUSINESS.phoneHref}>Call {BUSINESS.phoneDisplay}</a>
            <a href={BUSINESS.mapsUrl} target="_blank" rel="noreferrer">Directions</a>
            {nav.slice(1).map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
          </div>
        </div>
        <div className="shell footer-meta">
          <details>
            <summary>Opening hours</summary>
            <div>
              {HOURS.map((row) => <p key={row.days}><strong>{row.days}</strong>{row.hours}</p>)}
              <small>Public holiday hours may differ. Call to confirm.</small>
            </div>
          </details>
          <a href="/privacy">Privacy</a>
          <CursorToggle />
        </div>
        <div className="shell footer-bottom">
          <span>© {new Date().getFullYear()} Beach Road Pizza</span>
          <span>Christies Beach, South Australia</span>
        </div>
      </footer>
    </>
  );
}
