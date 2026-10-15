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
