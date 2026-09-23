# Beach Road Pizza on CentralPass: integration plan

## Status, 24 September 2026

**Decisions made:** pickup only for now (Uber Direct delivery comes later as a
platform feature), premium plan with every feature, web staff dashboard on a
tablet (no Android app yet), Stripe in test mode, Railway-provided domains
until the owner's DNS is available.

**Part B, the storefront, is built** and tested end to end against a local
CentralPass backend: live menu, sizes and deals, server-priced cart, promo
codes, automatic offers and home promo, checkout (pay in store tested; card
needs Stripe keys), receipt, tracking link, live sold-out, pause, surcharge,
native bookings and management, QR table ordering page, mailing list, privacy
policy, SEO. Turning Bookings off through the platform key (the Console's path)
hid the Book link and booking form with no redeploy.

**Part A is not required for launch.** With the decisions above, Beach Road
needs no platform or Console code changes; it is configuration. Part A stays as
a backlog to do in one pass, checked against Primo. Found while testing:

1. **Mailing list sign-up fails on a fresh database.** `routes/subscriptions.js`
   upserts with `ON CONFLICT (email)`, but migration 017 dropped the unique
   email constraint, so `POST /api/subscriptions` returns 500. Primo's database
   went through the same migrations, so its sign-up is probably broken too.
   **Fixed in [centralpass-platform#16](https://github.com/CentralPass/centralpass-platform/pull/16)**
   without a schema change; it goes live for every venue once merged. Until
   then the Beach Road site shows a friendly error on `/connect`.
2. **A new backend starts as Primo.** Migrations seed `restaurant_name =
   'Caffe Primo Firle'` and 7am to 3pm hours. `scripts/setup-venue.mjs`
   overwrites them for Beach Road; the platform should seed neutral values.
3. **Booking references are always `CP-…`**, hardcoded in `lib/bookings.js`.
4. The items in A1 to A7 below.

Setup steps are in [SETUP.md](SETUP.md).

---

Original plan, written earlier the same day:

## Goal

Beach Road Pizza gets its own backend, database, admin portal and staff
dashboard, all deployed from the one `CentralPass/centralpass-platform` repo.
No fork and no Beach Road branch. CentralPass Console switches every billable
feature. This repo stays the bespoke storefront and talks to its own backend
over HTTP only.

Caffe Primo Firle (`primo-firle-site`) is the reference for **how** a storefront
integrates: which endpoints to call, in what order, and how the cart, quote,
checkout and tracking hang together. It is not a design reference. No CSS,
tokens, layout, components or copy come across from it. Beach Road keeps its
own design.

## Target architecture

```text
beachroadpizza.com.au         this repo (Next.js on vinext, Cloudflare Workers)
admin.beachroadpizza.com.au   centralpass-platform/admin-portal    (Cloudflare Pages)
staff.beachroadpizza.com.au   centralpass-platform/staff-dashboard (Cloudflare Pages, kitchen tablet)
              |  HTTPS + Socket.io
              v
api.beachroadpizza.com.au     centralpass-platform/backend  (its own Railway project)
              +-- its own Postgres and R2 bucket
              +-- Beach Road's own Stripe account
              +-- /api/platform/*  <-- X-Platform-Key --  CentralPass Console
```

The domain names are placeholders until the venue confirms which domain it owns.

Primo runs the same code with a different Railway project, env vars, database and
domain. A fix in `centralpass-platform` reaches both venues on their next deploy.

## Who controls what

| Layer | Question it answers | Controlled by | Where |
|---|---|---|---|
| Entitlement | Has the venue paid for this? | CentralPass | Console, which writes to `/api/platform/features` |
| Operational toggle | Does the venue want it on today? | Venue owner | Admin portal Settings (pause orders, SMS on/off, cash/card) |
| Venue identity | Name, phone, address, ABN, logo mark | Venue owner (we set it up) | Admin portal, Settings, Restaurant info |

The Console owns the first layer. It should not reach into menus, hours or
orders, because those belong to the venue. So "every feature controlled from the
Console" means every billable capability has an entitlement key the Console can
flip. That is not true today (see A2 and A3).

---

## Part A: platform and Console work

These changes make a second venue possible, and Primo benefits from them too.
Every change must be venue-neutral: no Beach Road strings in the platform.

### A1. Remove Primo fallbacks that would leak into Beach Road

| File | Problem |
|---|---|
| `backend/src/lib/receipt.js` lines 187-189, 248, 359 | Printed dockets fall back to "CAFFE PRIMO FIRLE", a Firle address and caffeprimofirle.com.au |
| `printer-server/src/receipt.js` lines 87-93 | Same fallbacks |
| `backend/src/routes/admin/appBundles.js` line 26 | `DEFAULT_APP_ID = 'au.com.caffeprimofirle.staff'` |
| `staff-dashboard/capacitor.config.json` | App ID and name "Primo Staff", and the OTA `updateUrl` is hardcoded to Primo's Railway backend |
| `backend/server.js` line 57, `printer-server/src/server.js` line 119 | Startup logs say "Cafe Primo Firle" |

Receipt fallbacks should become generic or be left out. The app ID should come
from an env var such as `STAFF_APP_ID`. The Capacitor config should be generated
per venue (see A5).

### A2. Put every billable feature in the registry

`backend/src/config/features.js` lists 14 features. Some capabilities shipped
since then bypass entitlements entirely, so the Console can't see or switch them:

| Candidate key | Currently | Should be gated at |
|---|---|---|
| `table_ordering` | Always on | `/api/table-ordering`, `/api/staff/table-orders`, `/api/admin/table-ordering` |
| `day_end` | Always on | `/api/staff/day-end`, `/api/admin/day-end` |
| `table_payments` (requires `table_ordering`) | Railway env `TABLE_ORDERING_PAYMENTS_ENABLED` | Table-order payment routes |
| `booking_deposits` (requires `bookings`) | Railway env `BOOKING_PAYMENTS_ENABLED` | Booking deposit and payment routes |
| `staff_roles` | Always on | `/api/admin/staff-roles`. It could stay core; this is a product decision |

**Critical:** add every new key to the `premium` plan in `PLANS` in the same
commit. Primo runs `PLAN=premium`, and a key that is in `FEATURES` but not in
`premium` defaults to off. Primo's table ordering and day end would switch off
on its next deploy.

Follow the procedure in `PROJECT_CONTEXT.txt` section 18: registry entry, plan
membership, `requireFeature()` on routes, a check at the worker choke point, a
`feature:` key on the admin and staff nav entries, and a case in
`backend/test/features.test.js`.

### A3. Console renders the registry instead of a hardcoded list

`console/src/pages/VenueDetailPage.jsx` lines 10-15 hardcode `FEATURE_TIERS`
with the current 14 keys, so a feature added to the backend never appears in the
Console. The fix:

1. `describe()` in `backend/src/lib/entitlements.js` (line 105) also returns
   which plans grant each feature.
2. The Console groups features by that data instead of its own list.

After that, adding a feature to the platform shows it in the Console
automatically, for every venue.

### A4. Let the Console change the plan (optional, recommended)

`PLAN` is a Railway env var today, so moving Beach Road from `pro` to `premium`
means editing Railway and redeploying. The alternative is to store the plan in
the venue database, written through a new audited `PUT /api/platform/plan`, and
keep the `PLAN` env var as the bootstrap fallback. The existing safe default
(unset means "unconfigured", which grants everything) still applies.

### A5. A staff app per venue from one repo

The Android build hardcodes its app ID, name, `VITE_API_URL` and OTA URL.

- **Launch:** Beach Road staff use the web build at `staff.` on a tablet, so no
  APK is needed.
- **Later:** a build script takes `VENUE_APP_ID`, `VENUE_APP_NAME` and
  `VITE_API_URL` and writes `capacitor.config.json`, so each venue gets its own
  APK from the same source.

### A6. Public feature flags for storefronts

A storefront has no safe way to know whether bookings, offers or table ordering
are entitled. It only finds out when `/api/bookings` returns 402. Add a
`features` object of safe booleans to `GET /api/settings/public`, as the
Console's `CONNECTING_VENUES.md` already recommends. Then turning Bookings off in
the Console removes the Book link from the Beach Road site with no redeploy.

### A7. Release branch

`CENTRALPASS_OPERATIONS.md` says venues deploy from `release`, but there is no
`release` branch yet. Create it before Beach Road goes live, so a commit to
`main` can't auto-deploy into a Friday-night rush at two venues at once.

---

## Part B: this storefront

### What is here now

- **Menu, prices and deals:** hardcoded in `app/lib/site-data.ts` (695 lines).
- **Cart:** stored in localStorage, priced on the client, keyed by
  `category:name:size`.
- **Order page:** `OrderBuilder.tsx` builds a text summary, and its own copy
  says the order "has not been submitted or charged". There is no backend.
- **Hours and open status:** hardcoded in `StoreStatus.tsx`.
- **Enquiry form:** builds a phone brief and submits nothing.
- **Delivery:** the order page offers our own delivery "from $8", next to the
  Uber Eats and DoorDash links.
- **Starter leftovers:** `app/chatgpt-auth.ts`, `.openai/hosting.json`, `db/`,
  `drizzle/`, `examples/d1/`, and the vinext starter README. The CentralPass
  backend is the database, so these go.
- **Hosting:** deployed to Vercel (`vercel.json`). The operations playbook flags
  Vercel Hobby as non-commercial. vinext already builds for Cloudflare Workers,
  so move it there.

### What changes

Keep every page, visual, piece of copy, component style and CSS rule. Replace
only the data and transaction layer.

| Surface | Now | Becomes |
|---|---|---|
| Config | `BUSINESS` in site-data | `NEXT_PUBLIC_CENTRALPASS_API_URL` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. site-data keeps only what the API doesn't serve: socials, Uber Eats and DoorDash URLs, map URL, story copy |
| Identity and footer | Hardcoded | `GET /api/settings/public`, hiding unset fields |
| Open/closed badge | Hardcoded in `StoreStatus.tsx` | `GET /api/settings/hours`, refreshed every minute |
| Menu page | Static `MENU` | `GET /api/menu`, fetched on the server with a short revalidate so SEO keeps working |
| Deals | Static `DEALS` | Menu items in a Deals category; home promo from `GET /api/offers/featured` |
| Order page and cart | Local prices | `GET /api/menu`, an item sheet for size and extras, cart line = item ID plus sorted modifier IDs, sessionStorage, and a debounced `POST /api/orders/quote` for every total |
| Checkout (new `/checkout`) | None | Name and mobile, pickup slot from `hours.pickup`, cash and/or card per settings, Stripe Payment Element, `POST /api/orders` then `POST /api/orders/confirm`, clear handling of `STORE_CLOSED`, `ORDERS_PAUSED` and `OUTSIDE_SERVICE_WINDOW` |
| Receipt | None | Immutable snapshot and a tracking link, then the cart is cleared |
| Tracking (new `/track/[token]`) | None | `GET /api/orders/track/:token`, auto-refresh, `noindex` |
| Live sold-out | None | `socket.io-client` listening for `item_sold_out` |
| Enquiry | Phone brief | Keep as is. The platform has no enquiry endpoint |

For the behaviour behind each row, read `CUSTOMER_WEBSITE_BUILD_GUIDE.md` in the
platform repo and the matching Primo files (`src/lib/api.js`,
`src/store/cartStore.js`, `src/components/CartQuoteSync.jsx`,
`src/pages/Checkout.jsx`, `src/pages/OrderTracking.jsx`). Read them for the
logic, then write fresh TSX in this repo's own style.

### How Beach Road's menu maps onto the platform

- **Sizes:** one shared modifier group per price ladder (migration 016 supports
  shared groups). For example, "Traditional size" has Small as the base at $14.50,
  then Large +$4, Family +$12 and Party +$17. It's required, pick one. The owner
  changes a price once instead of on 20 pizzas. The few items with their own
  price ladder get their own group.
- **Deals:** menu items priced at the deal price, with required choice groups.
  For example, the "$25 Large Deal" has "Choose your traditional pizza" and
  "Choose your drink". Pricing stays with the backend, so the quote, the charge
  and the kitchen docket always agree.
- **Images:** uploaded through the admin portal (R2), not bundled in this repo,
  so the owner can change them.
- **Seed:** a one-off script reads `site-data.ts` and creates menus, categories,
  items and modifier groups through the admin API on Beach Road's backend. That
  saves hours of data entry. The owner then checks the prices.

### Delivery needs a decision

The platform is pickup-only: `orders.order_type` is `'pickup'` or `'table'`. The
site currently offers its own delivery "from $8". The options are:

1. **Launch pickup-only on CentralPass** and keep delivery on the Uber Eats and
   DoorDash links, which are already on the site. Recommended for launch.
2. **Build delivery into the platform.** `docs/UBER_DIRECT_INTEGRATION_PLAN.md`
   is a proposal and hasn't been started. Its first question is whether Uber
   Direct covers the area at all. It's a large job, and it would become a
   `delivery` entitlement the Console controls.

Don't ship a checkout that offers delivery until one of these exists.

---

## Part C: provisioning Beach Road

This follows `CENTRALPASS_OPERATIONS.md` section 7.

**The client does:**

1. Create a Stripe account and finish KYC. Start now, because it can take days.
2. Confirm they own the domain under their ABN.
3. Supply the ABN, logo and photos, and confirm the menu.

**We do:**

1. Create a Railway project `beachroad` on the agarwalhiranya account: Postgres
   plus a service from `CentralPass/centralpass-platform` with root `backend`,
   branch `release` and health check `/health`.
2. Set the backend env vars:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Injected by Railway |
   | `JWT_SECRET`, `PLATFORM_API_KEY` | New and unique. Never reuse Primo's |
   | `PLAN` | Set explicitly |
   | `BUSINESS_TIMEZONE` | `Australia/Adelaide` |
   | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | From the client's Stripe |
   | R2 variables | A new bucket |
   | `SMS_SENDER_ID` | 11 characters at most, e.g. `BeachRoadPz`. "BeachRoadPizza" is 14, which is too long. Register it with the provider |
   | `SMS_API_USERNAME`, `SMS_API_PASSWORD` | Our shared provider account |
   | `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | Our ESP, sending from their domain |
   | `PUBLIC_BASE_URL`, `PUBLIC_SITE_URL` | Their domains |
   | `CORS_ORIGIN` | The customer, `admin.` and `staff.` origins |
   | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `STAFF_PIN` | Their first logins |

3. In the admin portal, set the restaurant name, logo mark "BRP", address, phone,
   ABN, hours, pickup lead time and payment methods.
4. Create two Cloudflare Pages projects from `centralpass-platform`, one for
   `admin-portal` and one for `staff-dashboard`, each with
   `VITE_API_URL=https://api.<domain>`.
5. Deploy the storefront Worker from this repo with its `NEXT_PUBLIC_*` values.
6. DNS: CNAME `api.` to Railway, and point `admin.` and `staff.` at Pages.
7. In the Console, choose Add venue, enter the API URL, the three site URLs and
   the `PLATFORM_API_KEY`, then Test connection and save. Check that the plan
   badge doesn't say "unconfigured".
8. Set up the Star CloudPRNT printer and the tablet, add uptime monitoring on
   `/health`, and schedule `backup-db.js`.
9. Run the integration and production checklists in the build guide.

---

## Order of work

1. Platform: A1, A2, A6 and A7. They're small and venue-neutral. Test them under
   Primo's `premium` plan so nothing switches off.
2. Console: A3, plus A4 if wanted.
3. Local: run one backend on `localhost:3000` against a `beachroad` database,
   seed the menu, and point this site at it.
4. Storefront: Part B, in this repo's own design.
5. Provision: Part C. Staging first, then live only after a real-device kitchen
   test.

## Decisions needed

1. **Delivery:** pickup plus the Uber Eats and DoorDash links at launch, or build
   delivery?
2. **Plan:** starter, pro or premium for Beach Road?
3. **Domain:** which domain does Beach Road own?
4. **Staff app:** the web dashboard on a tablet for launch, or their own Android
   app now?
5. **Plan control:** should the Console be able to change the plan (A4)?
