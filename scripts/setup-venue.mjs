#!/usr/bin/env node
/**
 * Loads Beach Road Pizza into a fresh CentralPass backend through the admin
 * API: venue details, trading hours, booking mode and the full menu with
 * sizes and deals. Run it once per new deployment, then fine-tune everything
 * in the admin portal.
 *
 *   CENTRALPASS_API_URL=https://<backend>   the venue backend, no trailing /api
 *   ADMIN_EMAIL / ADMIN_PASSWORD            the venue's first admin login
 *   SITE_URL=https://<storefront>           optional, saved as the venue website
 *   IMAGE_BASE=https://<storefront>         optional, used for menu photos when
 *                                           the backend has no R2 bucket yet
 *
 *   node scripts/setup-venue.mjs [--only=settings,hours,bookings,menu] [--dry-run]
 *
 * Credentials come from the environment so they never land in shell history.
 * The menu step refuses to run when the backend already has categories, so it
 * can never duplicate or overwrite a menu someone has edited.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = (process.env.CENTRALPASS_API_URL || "").replace(/\/+$/, "");
const SITE_URL = (process.env.SITE_URL || "").replace(/\/+$/, "");
const IMAGE_BASE = (process.env.IMAGE_BASE || SITE_URL).replace(/\/+$/, "");
const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, value = "true"] = arg.replace(/^--/, "").split("=");
  return [key, value];
}));
const DRY = args.has("dry-run");
const ONLY = args.get("only") ? new Set(args.get("only").split(",")) : null;
const run = (step) => !ONLY || ONLY.has(step);

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

if (!API) fail("Set CENTRALPASS_API_URL to the venue backend, e.g. https://beachroad-backend.up.railway.app");
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) fail("Set ADMIN_EMAIL and ADMIN_PASSWORD for the venue's admin login.");

let token = null;

async function call(method, route, body, { form = false } = {}) {
  if (DRY && method !== "GET" && route !== "/api/admin/login") {
    console.log(`  [dry run] ${method} ${route}`);
    return { id: Math.floor(Math.random() * 1e6) };
  }
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  if (!form) headers["Content-Type"] = "application/json";
  const response = await fetch(`${API}${route}`, {
    method,
    headers,
    body: body == null ? undefined : form ? body : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.error || data.errors?.[0]?.msg || JSON.stringify(data);
    const error = new Error(`${method} ${route} → ${response.status}: ${detail}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

// ── Venue facts (the owner can change any of these later in the admin portal) ──

const SETTINGS = {
  restaurant_name: "Beach Road Pizza",
  brand_short: "BRP",
  restaurant_address: "29B Beach Road, Christies Beach SA 5165",
  restaurant_phone: "08 8186 5991",
  ...(SITE_URL ? { restaurant_website: SITE_URL } : {}),
  order_cash_enabled: true,
  order_card_enabled: true,
};

// Sunday is 0. Published hours: Mon to Thu 3 to 9 pm, Fri to Sun 3 to 9:30 pm.
const HOURS = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day_of_week: day,
  is_open: true,
  open_time: "15:00",
  close_time: day >= 1 && day <= 4 ? "21:00" : "21:30",
}));

// ── Menu modelling ────────────────────────────────────────────────────────────

const CATEGORY_ORDER = [
  "Deals",
  "Traditional pizzas",
  "Gourmet pizzas",
  "Vegan pizzas",
  "Sides",
  "Schnitzels",
  "Pastas",
  "Drinks and treats",
];

// Items the site listed without a fixed online price. Left for the owner.
const SKIP = new Map([["Ice-creams", "price varies (\"From $2\"), add in the admin portal if wanted"]]);

const money = (value) => Number(String(value).replace(/[^0-9.]/g, ""));

/** "Small $14.50 | Large $18.50" → [{ name: "Small", price: 14.5 }, …] */
function parseSizes(sizes) {
  return sizes.split("|").map((part) => {
    const match = part.trim().match(/^(.*?)\s+\$([0-9]+(?:\.[0-9]+)?)$/);
    if (!match) throw new Error(`Can't read size "${part}"`);
    return { name: match[1].trim(), price: Number(match[2]) };
  });
}

/** The ladder's name decides which shared size group an item uses. */
function sizeGroupName(item) {
  if (item.name === "Vegan Veggie") return "Vegan Veggie size";
  if (item.name === "Chicken Nuggets") return "Nuggets";
  if (item.name === "BBQ Ribs") return "Ribs";
  if (item.category === "Traditional pizzas") return "Traditional pizza size";
  if (item.category === "Gourmet pizzas") return "Gourmet pizza size";
  if (item.category === "Vegan pizzas") return "Vegan pizza size";
  throw new Error(`No size group for ${item.name}`);
}

// Deal names drop the price, which lives in base_price so the owner can change
// it in one place. The $54 "Family Deal" becomes "Double Family Deal" so the
// two family deals can be told apart on dockets.
const DEAL_SHAPES = [
  { match: /^\$25 Large Deal$/, name: "Large Deal", picks: [["traditional", 1]] },
  { match: /^\$32 Family Deal$/, name: "Family Deal", picks: [["traditional", 1]] },
  { match: /^\$37 Party Deal$/, name: "Party Deal", picks: [["traditional", 1]] },
  { match: /^\$40 Double Deal$/, name: "Double Deal", picks: [["traditional", 2]] },
  { match: /^\$47 Triple Deal$/, name: "Triple Deal", picks: [["traditional", 3]] },
  { match: /^\$54 Family Deal$/, name: "Double Family Deal", picks: [["traditional", 2]] },
  { match: /^\$49 Gourmet Deal$/, name: "Gourmet Deal", picks: [["gourmet", 2]] },
  { match: /^\$49 Vegan Deal$/, name: "Vegan Deal", picks: [["vegan", 2]], vegan: true },
  { match: /^\$25 Schnitzel Deal$/, name: "Schnitzel Deal", picks: [] },
];

const PICK_CATEGORY = { traditional: "Traditional pizzas", gourmet: "Gourmet pizzas", vegan: "Vegan pizzas" };

function pickGroupNames(kind, count) {
  if (count === 1) return [`Choose your pizza (${kind})`];
  return Array.from({ length: count }, (_, index) => `Pizza ${index + 1} (${kind})`);
}

async function uploadImage(relative) {
  const file = path.join(ROOT, "public", relative.replace(/^\//, ""));
  try {
    const bytes = await readFile(file);
    const form = new FormData();
    form.append("image", new Blob([bytes], { type: "image/jpeg" }), path.basename(file));
    const result = await call("POST", "/api/admin/upload", form, { form: true });
    return result.url;
  } catch (error) {
    if (IMAGE_BASE && /^https:\/\//.test(IMAGE_BASE)) return `${IMAGE_BASE}${encodeURI(relative)}`;
    return { skipped: error.message };
  }
}

async function setupMenu(source) {
  const existing = await call("GET", "/api/admin/categories");
  if (Array.isArray(existing) && existing.length) {
    console.log(`  Menu skipped: the backend already has ${existing.length} categories. Edit the menu in the admin portal instead.`);
    return;
  }

  const menu = await call("POST", "/api/admin/menus", { name: "Menu", service_start: "00:00", service_end: "23:59", display_order: 0 });
  console.log(`  Menu "Menu" created (all day)`);

  // Shared modifier groups: one per price ladder, so a price changes once for every pizza on it.
  const groups = new Map();
  async function group(name, options, { min = 1, max = 1 } = {}) {
    if (groups.has(name)) return groups.get(name);
    const created = await call("POST", "/api/admin/modifier-groups", { name, min_selections: min, max_selections: max });
    for (const [index, option] of options.entries()) {
      await call("POST", `/api/admin/modifier-groups/${created.id}/options`, {
        name: option.name,
        price_delta: option.delta.toFixed(2),
        sort_order: index,
      });
    }
    groups.set(name, created.id);
    console.log(`  Group "${name}" (${options.length} options)`);
    return created.id;
  }

  const categories = new Map();
  for (const [index, name] of CATEGORY_ORDER.entries()) {
    const created = await call("POST", "/api/admin/categories", { name, menu_ids: [menu.id], display_order: index });
    categories.set(name, created.id);
  }
  console.log(`  ${categories.size} categories created`);

  const imageNotes = [];
  let created = 0;
  let order = 0;

  async function addItem({ category, name, description, price, featured = false, vegan = false, image = null, attach = [] }) {
    let image_url;
    if (image) {
      const uploaded = await uploadImage(image);
      if (typeof uploaded === "string") image_url = uploaded;
      else imageNotes.push(`${name}: ${uploaded.skipped}`);
    }
    const item = await call("POST", "/api/admin/menu-items", {
      category_id: categories.get(category),
      name,
      description,
      base_price: price.toFixed(2),
      display_order: order++,
      is_featured: featured,
      dietary_tags: vegan ? ["vegan"] : [],
      ...(image_url ? { image_url } : {}),
    });
    for (const [index, groupId] of attach.entries()) {
      await call("POST", `/api/admin/menu-items/${item.id}/modifier-groups`, { group_id: groupId, required: true, sort_order: index });
    }
    created += 1;
  }

  // Regular items.
  const byCategory = new Map();
  for (const item of source.menu) {
    if (SKIP.has(item.name)) continue;
    let price;
    const attach = [];
    if (item.sizes) {
      const sizes = parseSizes(item.sizes);
      price = sizes[0].price;
      attach.push(await group(sizeGroupName(item), sizes.map((size) => ({ name: size.name, delta: size.price - price }))));
    } else {
      price = money(item.price);
    }
    const description = item.name === "Crumbed Chicken Zing" ? `${item.description} Large only.` : item.description;
    await addItem({ category: item.category, name: item.name, description, price, featured: Boolean(item.popular), vegan: Boolean(item.vegan), image: item.image || null, attach });
    byCategory.set(item.category, [...(byCategory.get(item.category) || []), item.name]);
  }

  // Deals: fixed price, the customer picks which pizzas.
  for (const deal of source.deals) {
    const shape = DEAL_SHAPES.find((entry) => entry.match.test(deal.title));
    if (!shape) {
      imageNotes.push(`Deal "${deal.title}" not recognised, add it in the admin portal`);
      continue;
    }
    const attach = [];
    for (const [kind, count] of shape.picks) {
      const choices = (byCategory.get(PICK_CATEGORY[kind]) || []).map((pizza) => ({ name: pizza, delta: 0 }));
      for (const groupName of pickGroupNames(kind, count)) attach.push(await group(groupName, choices));
    }
    // Deals go first in the Deals category; reset ordering for them.
    await addItem({ category: "Deals", name: shape.name, description: deal.detail, price: money(deal.title.split(" ")[0]), vegan: Boolean(shape.vegan), attach });
  }

  console.log(`  ${created} menu items created`);
  for (const [name, reason] of SKIP) console.log(`  Not loaded: ${name}, ${reason}`);
  if (imageNotes.length) {
    console.log("  Notes:");
    for (const note of imageNotes) console.log(`   - ${note}`);
  }
}

// ── Run ────────────────────────────────────────────────────────────────────────

console.log(`Setting up Beach Road Pizza on ${API}${DRY ? " (dry run)" : ""}`);
const health = await fetch(`${API}/health`).then((response) => response.ok).catch(() => false);
if (!health) fail(`${API}/health is not responding. Is the backend deployed and running?`);

({ token } = await call("POST", "/api/admin/login", { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }));
console.log("✓ Signed in as the venue admin");

if (run("settings")) {
  await call("PUT", "/api/admin/settings", SETTINGS);
  console.log("✓ Venue details saved (name, logo mark, address, phone, payment methods)");
}

if (run("hours")) {
  await call("PUT", "/api/admin/hours", HOURS);
  console.log("✓ Trading hours saved (Mon to Thu 3 to 9 pm, Fri to Sun 3 to 9:30 pm)");
}

if (run("bookings")) {
  // Native provider, switched off until the owner sets tables and capacity.
  await call("PUT", "/api/admin/bookings/settings", { provider: "native", enabled: false });
  console.log("✓ Bookings set to the built-in system, currently off (turn on in admin once tables are set)");
}

if (run("menu")) {
  const source = JSON.parse(await readFile(path.join(ROOT, "scripts", "menu-source.json"), "utf8"));
  console.log("… Loading the menu");
  await setupMenu(source);
  console.log("✓ Menu loaded. Check prices, photos and deal drinks in the admin portal.");
}

console.log("\nDone.");
