# Beach Road Pizza website

The customer website for Beach Road Pizza, Christies Beach. It is the bespoke
storefront half of a CentralPass venue: the design lives here, and everything
the owner manages (menu, prices, deals, hours, pause, offers, promo codes,
bookings) comes from the venue's own CentralPass backend over HTTP.

```text
this site ──HTTP + Socket.io──> Beach Road backend (centralpass-platform/backend)
                                  ├── admin portal   (centralpass-platform/admin-portal)
                                  ├── staff dashboard(centralpass-platform/staff-dashboard)
                                  └── /api/platform  <── CentralPass Console
```

The site never imports platform code and holds no secrets. Its only link to
CentralPass is `NEXT_PUBLIC_CENTRALPASS_API_URL`. See
[docs/CENTRALPASS_INTEGRATION.md](docs/CENTRALPASS_INTEGRATION.md) for the
wider plan and [docs/SETUP.md](docs/SETUP.md) for provisioning.

## What the site does

| Route | What it is |
|---|---|
| `/` | Home. Deals from the live Deals category, live hours, featured-offer popup, restaurant structured data |
| `/menu` | Browse and search the live menu (server-rendered for search engines, refreshed in the browser) |
| `/order` | Live ordering: sizes and options, Offers group, sold-out updates in real time, closed/paused/surcharge notices, cart with promo codes priced by the server |
| `/checkout` | Pickup details, ASAP or a time slot, pay in store or by card (Stripe Payment Element), receipt and tax invoice |
| `/track/[token]` | Private order tracking. **The backend emails and texts customers this link**, built from its `PUBLIC_SITE_URL` |
| `/bookings` | Native table bookings, shown only when bookings are on and entitled |
| `/bookings/manage/[token]` | Guest booking management (cancel, request a change). **Linked from booking confirmations** |
| `/table` | QR table ordering. **The admin portal's QR signs point here** (backend `TABLE_ORDERING_URL`) |
| `/connect` | Mailing-list sign-up with explicit consent |
| `/enquire`, `/our-story`, `/privacy` | Venue pages |

Online orders are pickup only. Delivery stays on Uber Eats and DoorDash until
CentralPass delivery ships.

The backend enforces everything: prices, offers, surcharges, hours, pauses,
pickup times and availability. The browser only previews them.

## Run locally

Node 22.13 or newer. Run one CentralPass backend on `localhost:3000` (see
`centralpass-platform/README.md`) with `http://localhost:3001` in its
`CORS_ORIGIN` and `PUBLIC_SITE_URL`.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3001`.

## Load Beach Road into a new backend

`scripts/setup-venue.mjs` signs in as the venue admin and loads the venue
details, trading hours, booking mode and the full menu (sizes as shared option
groups, deals with pizza choices) from `scripts/menu-source.json`. It refuses
to touch a backend that already has a menu.

```bash
CENTRALPASS_API_URL=https://<backend> ADMIN_EMAIL=<admin email> ADMIN_PASSWORD=<admin password> SITE_URL=https://<this site> npm run setup:venue
```

Menu photos upload to the backend's R2 bucket. Without R2 yet, they point at
this site's own `/images/food/...` files when `SITE_URL` is https.

## Deploy (Railway)

A standard Next.js app: build `npm run build`, start `npm start` (Next reads
Railway's `PORT`). Set the `NEXT_PUBLIC_*` variables from `.env.example` on the
service; they are compiled in, so redeploy after changing them.

## Tests

```bash
npm test
```

Builds, starts the production server and checks the key pages, private-page
`noindex`, the sitemap, the privacy policy and the absence of secret keys or
another venue's details.
