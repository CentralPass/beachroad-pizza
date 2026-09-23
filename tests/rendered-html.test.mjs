/**
 * Smoke tests against the production build. Run `npm test`, which builds
 * first. No backend is needed: pages must render their fallback states, and
 * private pages must stay out of search engines either way.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { after, before, test } from "node:test";

let server;
let origin;

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

before(async () => {
  const port = await freePort();
  origin = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", String(port), "--hostname", "127.0.0.1"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/robots.txt`);
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("next start did not come up within 30s. Did you run `npm run build`?");
});

after(() => server?.kill());

async function page(pathname) {
  const response = await fetch(`${origin}${pathname}`);
  return { status: response.status, html: await response.text() };
}

test("home keeps the Beach Road design and links into ordering", async () => {
  const { status, html } = await page("/");
  assert.equal(status, 200);
  assert.match(html, /Great pizzas\./);
  assert.match(html, /For a great community\./);
  assert.match(html, /Straight from the menu/);
  assert.match(html, /href="\/order/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /"@type":"Restaurant"/);
});

test("menu and order pages render and are indexable", async () => {
  const menu = await page("/menu");
  assert.equal(menu.status, 200);
  assert.match(menu.html, /Search the menu/);
  assert.doesNotMatch(menu.html, /noindex/);

  const order = await page("/order");
  assert.equal(order.status, 200);
  assert.match(order.html, /Pizza night, sorted\./);
  assert.match(order.html, /Your favourites\./);
});

test("checkout, tracking, booking management and table pages are private", async () => {
  for (const pathname of ["/checkout", "/track/abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG", "/bookings/manage/abc123", "/table"]) {
    const { status, html } = await page(pathname);
    assert.equal(status, 200, pathname);
    assert.match(html, /<meta name="robots" content="noindex, nofollow/, pathname);
  }
  const tracking = await page("/track/abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG");
  // The bearer token must never be repeated in canonical or share metadata.
  const head = tracking.html.split("</head>")[0];
  assert.doesNotMatch(head.replace(/<title>[^<]*<\/title>/, ""), /rel="canonical"[^>]*abcdefghijklmnopqrstuvwxyz/);
  assert.doesNotMatch(head, /og:url"[^>]*abcdefghijklmnopqrstuvwxyz/);
});

test("sitemap lists public pages only", async () => {
  const { status, html } = await page("/sitemap.xml");
  assert.equal(status, 200);
  for (const pathname of ["/menu", "/order", "/privacy"]) assert.match(html, new RegExp(`${pathname}</loc>`));
  for (const pathname of ["/checkout", "/track", "/table", "/bookings/manage"]) assert.doesNotMatch(html, new RegExp(`${pathname}`));
});

test("privacy policy covers what online ordering collects", async () => {
  const { html } = await page("/privacy");
  assert.match(html, /Stripe/);
  assert.match(html, /unsubscribe/);
  assert.match(html, /session storage/);
});

test("no secret keys or another venue's identity in the bundle", async () => {
  const { html } = await page("/");
  assert.doesNotMatch(html, /sk_(live|test)_/);
  assert.doesNotMatch(html, /Primo|Firle/i);
});
