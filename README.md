# Stopbill

Stopbill is a **free** browser extension that guides you through cancelling a ChatGPT subscription.
It shows the steps for the place you pay (web, Apple, or Google Play), opens ChatGPT when you ask,
and keeps track of your progress. **You make every click.**

This repository holds the marketing site (`/`) and the extension (`extension/`). There is no backend,
no account system, and no payment in this version.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173 (site). Also packages the extension zip.
npm test             # extension logic, privacy manifest checks, site copy guards
npm run build        # typecheck, production build, extension zip
```

## Load the extension in Chrome or Edge

1. `npm run package:extension`, or download `public/downloads/stopbill-extension.zip` from the built site.
2. Unzip it. Open `chrome://extensions` (or `edge://extensions`) and turn on Developer mode.
3. Choose **Load unpacked** and select the unzipped folder.
4. Pin Stopbill and open the popup.

Firefox is not supported yet. The extension is not in the Chrome Web Store.

## Gmail scan: setup (developer)

The scan uses Chrome's Google sign-in and the read-only Gmail scope. You need to do this once:

1. In Google Cloud Console, create a project, enable the **Gmail API**, and set up the OAuth consent screen.
   Add the scope `https://www.googleapis.com/auth/gmail.readonly`.
2. Load the unpacked extension (see above) and copy its **ID** from `chrome://extensions`.
3. Create an OAuth client of type **Chrome Extension** using that ID. Copy its client ID.
4. Replace `REPLACE_WITH_CHROME_OAUTH_CLIENT_ID` in `extension/manifest.json` with that client ID, then reload the extension.
5. Add each tester's Google account as a **test user**. Until Google verifies the app, only test users can sign in.

Google treats `gmail.readonly` as a restricted scope. Verification and a possible yearly security assessment are required
before public release. Google's rule covers data that passes through a third-party server, and this design sends it only
from the browser to Gmail, but confirm that with Google before launch.

## Guardrails (keep these true)

- **Minimal reach.** `extension/manifest.json` may ask only for `storage`, `identity`, `identity.email`, and host access to
  `https://gmail.googleapis.com/*`, with the single `gmail.readonly` scope. There are no content scripts.
  `scripts/package-extension.mjs` fails the build if this changes. Tests check it too.
- **Read-only, narrow Gmail queries.** Only AI-service billing senders and billing words are searched. Only headers and the
  snippet are requested. Message bodies and attachments are never requested.
- **No automated clicks on third-party services.** Each step is a checklist item the customer completes.
  OpenAI's Terms of Use prohibit automated or programmatic extraction of data or output from its services,
  so ChatGPT steps are guided only.
- **No credentials, no server.** Stored in `chrome.storage.local`: the billing channel, checklist progress, an optional
  end date, and scan results. Nothing is sent to a Stopbill server.
- **Claims stay within the product.** Copy must not promise refunds, guaranteed cancellation, or legal
  compliance. `src/lib/site.ts` is the single place for copy. `src/components/*` may only add layout.

## Adding another AI tool

1. Confirm its terms of service and get legal review. Write down what the review allowed.
2. Add a flow to `extension/lib/flows.js` with steps the customer performs, plus a help link on that
   provider's own domain.
3. Add tests for the new flow in `tests/extension.test.mjs`.
4. Update the copy in `src/lib/site.ts`.

## Before launch

- Legal review of the guided flow, terms of service, and privacy policy. Neither document is in the repo yet.
- Confirm each ChatGPT step against the live OpenAI pages. The labels in `flows.js` come from OpenAI's help
  center and may change.
- Decide where the extension will be distributed (Chrome Web Store or zip).
- Replace the placeholder contact email in `src/lib/site.ts`, and confirm the `stopbill.dev` domain.
- Brand name "Stopbill" is a placeholder. Change it in `src/lib/site.ts` and `extension/manifest.json`.

## Known gaps

- Scans read only the first 100 matching messages from the last 365 days, one Chrome-signed-in account at a time.
  Lookups work only for accounts that have been scanned. Accounts need Chrome sign-in.
- Apple subscriptions show up only when Apple sends the receipt to a scanned Gmail address.
- Gmail scanning is limited to test users until Google verifies the app. Chrome is the supported browser.
- Only ChatGPT is supported for cancellation. Only the web flow opens a page for the customer.
- The end-date field is for the customer's own notes. Nothing checks it against the provider.
- No reminder notifications.
- The extension is not signed for the Chrome Web Store, so installs use Developer mode.
