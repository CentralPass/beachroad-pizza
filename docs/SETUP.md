# Setting up Beach Road Pizza on CentralPass

Runbook for the first deployment: Railway, Stripe in test mode, Railway-provided
domains, premium plan, web staff dashboard, pickup only. Work top to bottom;
each step names what it needs from the one before.

Nothing here changes Primo. Beach Road gets its own Railway project, database,
secrets and Stripe keys, all built from the same repos.

## 0. Before you start

- Access to the Railway account that will own the project (the playbook says `agarwalhiranya@gmail.com`).
- The `CentralPass` GitHub org connected to that Railway account (Railway's GitHub App).
- The `CentralPass/beachroad-pizza` repo pushed with this storefront code.
- A Stripe account in **test mode**. Later, Beach Road's own Stripe (they do KYC) replaces it.
- An email or SMS sender. **The backend refuses to start in production without at least one.** Easiest now: CentralPass's Brevo API key and a sender address already verified in Brevo.
- CentralPass Console sign-in (email, password, TOTP).

Generate each secret separately:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 1. Railway project and database

1. New project, name `beachroad`.
2. Add **PostgreSQL**.

## 2. Backend service

1. Add service → GitHub repo `CentralPass/centralpass-platform`.
2. Settings: Root Directory `backend`, branch `main`, health check path `/health`. Start command stays `npm start`, which runs migrations and then the server.
3. Networking → **Generate domain**. Call it `API_URL` below, e.g. `https://beachroad-backend-production.up.railway.app`.
4. Variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | new secret. **Never Primo's** |
| `PLATFORM_API_KEY` | new secret, kept for Console step 8. **Never Primo's** |
| `PLAN` | `premium` |
| `BUSINESS_TIMEZONE` | `Australia/Adelaide` |
| `ADMIN_EMAIL` | the admin login you want |
| `ADMIN_PASSWORD` | strong, 12+ characters |
| `STAFF_PIN` | a non-obvious 6 digits |
| `STRIPE_SECRET_KEY` | `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | from step 3, fill in after |
| `ALLOW_STRIPE_TEST_KEYS` | `true` (production refuses test keys without it; remove when live keys go in) |
| `BREVO_API_KEY` + `EMAIL_FROM` (+ `EMAIL_REPLY_TO`) | email sender; or `SMS_API_USERNAME` + `SMS_API_PASSWORD` + `SMS_SENDER_ID` (11 characters max, e.g. `BeachRoadPz`) |
| `PUBLIC_SITE_URL` | the storefront URL from step 6 |
| `PUBLIC_BASE_URL` | `API_URL` |
| `CORS_ORIGIN` | storefront, admin and staff URLs, comma separated, no spaces, no `*` |
| `TABLE_ORDERING_URL` | `<storefront URL>/table` |

Deploy. Until step 6 exists, set `CORS_ORIGIN` and `PUBLIC_SITE_URL` to
placeholders and come back. Check `API_URL/health` returns `{"status":"ok"}`.

R2 (menu photo uploads), `BOOKING_PORTAL_URL`, and the booking/table payment
switches can wait.

## 3. Stripe test webhook

Stripe dashboard (test mode) → Developers → Webhooks → Add endpoint:

- URL: `API_URL/api/stripe/webhook`
- Events: `payment_intent.succeeded`, `checkout.session.completed`, `charge.refunded`

Copy the signing secret (`whsec_…`) into the backend's `STRIPE_WEBHOOK_SECRET` and redeploy.

## 4. Admin portal service

Add service → `CentralPass/centralpass-platform`, Root Directory `admin-portal`.
Copy the build and serve settings from Primo's admin service so it is served
the same way. Variable: `VITE_API_URL=API_URL`. Generate a domain (`ADMIN_URL`).

## 5. Staff dashboard service

Same again with Root Directory `staff-dashboard`, `VITE_API_URL=API_URL`, and
a generated domain (`STAFF_URL`). The kitchen tablet uses this URL in a browser.
No Android app for now.

## 6. Storefront service

Add service → `CentralPass/beachroad-pizza`, root `/`. Build `npm run build`,
start `npm start`. Variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CENTRALPASS_API_URL` | `API_URL` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` from the same Stripe account |
| `NEXT_PUBLIC_SITE_URL` | this service's generated domain (`SITE_URL`) |

Generate the domain first, set `NEXT_PUBLIC_SITE_URL`, then deploy. These are
compiled in, so any change needs a redeploy.

Then go back to the backend and set the real values:

```text
PUBLIC_SITE_URL=SITE_URL
CORS_ORIGIN=SITE_URL,ADMIN_URL,STAFF_URL
TABLE_ORDERING_URL=SITE_URL/table
```

Redeploy the backend.

## 7. Load Beach Road

From this repo, with the backend's admin login in the environment:

```bash
CENTRALPASS_API_URL=API_URL ADMIN_EMAIL=… ADMIN_PASSWORD=… SITE_URL=SITE_URL npm run setup:venue
```

This loads the name, logo mark "BRP", address, phone, hours, booking mode (built-in, off) and the full menu: 77 items plus 9 deals, sizes as shared option groups. **A fresh platform database is seeded with Primo's name and 7am to 3pm hours; this step replaces them.** Then, in the admin portal (`ADMIN_URL`):

- Check prices, and the deal descriptions (drinks are not a choice yet).
- Add the ABN in Settings → Restaurant info (receipts need it).
- Add Ice-creams if wanted (skipped: its price varies).
- Menu photos: without R2 they point at the storefront's own images; add R2 later to manage photos in admin.

## 8. CentralPass Console

Console → **Add venue**:

- Name `Beach Road Pizza`, slug `beach-road-pizza`
- API URL `API_URL`
- Customer `SITE_URL`, owner `ADMIN_URL`, staff `STAFF_URL`
- Platform key: the backend's `PLATFORM_API_KEY`

**Test connection**, then save. The plan badge should say `premium`, not
`unconfigured`. Every feature shows on. Toggling Bookings off here hides the
storefront's Book link within seconds, with no redeploy.

## 9. Test before showing anyone

- [ ] Order pay-in-store: appears once on `STAFF_URL`, with sizes and deal pizzas.
- [ ] Order by card with `4242 4242 4242 4242`: appears once, receipt shows the paid total.
- [ ] Tracking link (receipt and email/SMS) opens `SITE_URL/track/…` and follows accept → ready → collected.
- [ ] Mark an item sold out in staff: it disappears from `/order` and the cart without a reload.
- [ ] Pause orders in staff: the site blocks checkout and says so.
- [ ] Promo code from admin applies in the cart; an invalid code is explained.
- [ ] Console: toggle a feature off and back, check the audit shows it.
- [ ] Declined card `4000 0000 0000 0002`: no kitchen order appears.

## Later

- Custom domains once the owner's DNS is available: `beachroadpizza.com.au`, `admin.`, `staff.`, `api.` (CNAME to Railway). Update every URL variable above and redeploy all four services.
- Beach Road's own Stripe live keys; remove `ALLOW_STRIPE_TEST_KEYS`.
- R2 bucket for photos, verified sender domain, SMS sender ID registration, receipt printer, `/health` uptime monitoring, scheduled database backups.
