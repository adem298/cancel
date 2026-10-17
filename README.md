# Stopbill site

Marketing site for **Stopbill**, a cancel flow for Stripe subscriptions: save offers,
real cancellation through the Stripe API, and a billing check that alerts the owner
when Stripe still shows a subscription as active.

The site includes an interactive demo of the customer flow. The demo uses simulated
data and makes no requests to Stripe.

## Stack

- Vite 8, React 19, TypeScript (strict)
- Tailwind CSS v4
- lucide-react icons, self-hosted Inter and JetBrains Mono (`@fontsource-variable`)
- Vitest for unit tests on the billing logic

## Getting started

Requires Node.js 20.19 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build to dist/
npm run preview    # serve dist/ on http://localhost:4173
npm test           # unit tests
```

## Project layout

```
src/
  App.tsx                 page composition and section order
  lib/site.ts             brand, nav, pricing, FAQ, roadmap copy (edit content here)
  lib/billing.ts          pure cancellation logic used by the demo
  components/             one component per page section
  index.css               design tokens (@theme) and utilities
tests/billing.test.ts     unit tests for save offers, date math, billing check
public/                   favicon, robots.txt, sitemap.xml, og.png
```

## Before launch: placeholders to replace

These values are placeholders and need to be confirmed:

- **Brand name and domain.** `Stopbill` and `stopbill.dev` are working names. They
  appear in `src/lib/site.ts`, `index.html` (canonical, Open Graph, JSON-LD),
  `public/sitemap.xml`, and `public/robots.txt`.
- **Contact address.** `BRAND.contactEmail` in `src/lib/site.ts`.
- **Pricing bands.** The subscriber limits on each plan (500 / 2,500 / 10,000) are
  assumptions. Confirm them before publishing. Prices are from the product plan.
- **Widget CDN.** The install snippet in the hero points at `cdn.stopbill.dev`.
- **Legal pages.** No privacy policy or data processing terms are linked yet. Add
  them before collecting audit requests at scale.
- **Audit form.** There is no backend. Submitting opens the visitor's mail client
  addressed to the contact address. Replace this with a real endpoint when one exists.

## Content guidelines

- Do not promise a recovery rate. The dashboard numbers are labelled as sample data.
- Do not claim legal compliance. The compliance copy states that this is not legal
  advice and that counsel should review the flow for each market.
- Do not describe features that are not built yet as shipped. The roadmap section
  marks Paddle, Lemon Squeezy, win-back emails, and A/B testing as planned.

## Product frontend

The repository also contains the embeddable cancel widget and the owner dashboard.
Both run against a typed API contract (`src/shared/types.ts`). The default backend is an
in-browser demo (`src/shared/mock/`) that stores data in localStorage. The HTTP client
(`src/shared/http/`) is ready for the real backend.

| URL | What it is |
| --- | --- |
| `/app` | Owner dashboard (demo sign-in: any email, password of 8+ characters) |
| `/embed-demo/index.html` | A host page that embeds the widget the way a customer would |
| `/widget/stopbill.js` | Built widget bundle (generated, git-ignored) |

```bash
npm run build:widget   # builds public/widget/stopbill.js (also runs before dev and build)
```

Widget embed:

```html
<script src="https://cdn.stopbill.dev/v1/stopbill.js" data-token="SIGNED_CUSTOMER_TOKEN" async></script>
```

Attributes: `data-token` (required), `data-label`, `data-mount`, `data-api`, `data-mode`
(`demo` uses the in-browser backend; never use it in production). Events:
`stopbill:outcome` (`scheduled`, `canceled`, `saved`, `unconfirmed`) on the host element.

Environment variables: `VITE_API_MODE` (`demo` by default, or `live`) and
`VITE_API_BASE_URL` (empty means same origin).

## Extension and backend

Cancelling is free. Customers pay a one-time fee for the **Stopbill browser extension**, which
they install on their laptop. The purchase flow uses Stripe Checkout. Each license works on up to
two devices.

| Path | What it does |
| --- | --- |
| `/extension` | Purchase page (starts Stripe Checkout) and download link |
| `/extension/success` | Shows the license key once after payment |
| `/api/checkout` | Creates the Checkout session for the extension price |
| `/api/stripe-webhook` | Verifies the Stripe signature and records paid purchases (idempotent) |
| `/api/license/claim` | Issues the key for a paid session, once |
| `/api/license/activate` | Registers a device and returns a 30-day device token |
| `/api/license/status` | Confirms the device token and license are still active |

Code: `api/` (Vercel functions), `server/lib/` (logic), `db/schema.sql` (Postgres),
`extension/` (MV3 extension source), `scripts/package-extension.mjs` (builds the zip).

### How cancellation works in the extension

Automated steps run only when the customer clicks each one, and only on the hosts listed in an
adapter. `extension/adapters.js` ships **empty**. Add a service only after its terms of service
have been reviewed, and get legal review before you enable automated steps for any third-party
service. Read the notes below before enabling any service.

### Deploy checklist

1. **Database (Neon):** create a project and copy the connection string into `DATABASE_URL`.
   Apply the schema: `DATABASE_URL=... npm run db:migrate` (safe to re-run).
2. **Stripe:** create a one-time Price for the extension and copy its ID into `EXTENSION_PRICE_ID`.
   Create a restricted key with Checkout Sessions read and write access (`STRIPE_SECRET_KEY`).
   Add a webhook endpoint at `https://YOUR-DOMAIN/api/stripe-webhook` for
   `checkout.session.completed` and copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
3. **Secrets:** set `LICENSE_TOKEN_SECRET` to 32 or more random characters (for example
   `openssl rand -base64 48`).
4. **Vercel:** import the repository and set every variable from `.env.example`. Set
   `EXTENSION_API_BASE` to the public origin. The packaged extension only talks to that origin.
5. **Verify:** complete a test purchase with Stripe's test card `4242 4242 4242 4242`. Confirm the
   key appears on `/extension/success`, then activate it in the extension. Check that a second
   activation on a third device is refused.

### Local development with the API

`npm run dev` serves the site, but Vite does not run `/api` routes. To test purchase and
activation locally, use the Vercel CLI: `npx vercel dev`, with a `.env.local` file that
contains the variables above (pointing at a test database and Stripe test keys).

### Known gaps before launch

- **Owner-side API is not built.** The dashboard and widget still run in demo mode
  (`VITE_API_MODE=demo`). The HTTP client exists, but the real endpoints and Stripe read-back
  for businesses are not implemented.
- **Webhook raw body:** the webhook sets `bodyParser: false`. Confirm the signature check passes on
  Vercel with a Stripe test event before going live.
- **Email:** license keys are shown on the success page only. Nothing is emailed yet.
- **No device management UI** and no key reset. Support must free a device manually.
- **No rate limiting** on activation yet. Keys have 60 bits of entropy, but add rate limiting
  at the edge before launch.
- **Not tested against live services:** Stripe, Neon, and Vercel could not be reached from the
  build sandbox. Database logic was tested against a real local Postgres (`TEST_DATABASE_URL`).
- **Pricing:** the marketing page still shows the original subscription tiers. Update it to
  match the free-service and one-time-extension model.
- **Legal:** automated cancellation on third-party services carries terms-of-service and
  consumer-protection risk. Get legal review before enabling any adapter.
