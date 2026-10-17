# Stopbill

Stopbill is a **free** browser extension that guides you through cancelling a ChatGPT subscription.
It shows the steps for the place you pay (web, Apple, or Google Play), opens ChatGPT when you ask,
and keeps track of your progress. **You make every click.** It can also scan your Gmail, read-only,
for AI billing receipts and list them by email address.

This repository holds the marketing site (`/`) and the extension (`extension/`). There is no backend,
no account system, and no payment in this version.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173 (site). Also packages the extension zip.
npm test             # extension logic, sign-in, privacy manifest checks, site copy guards
npm run build        # typecheck, production build, extension zip
```

## Install the extension (Chrome, Edge, Brave, or Opera)

The extension uses only standard Chromium APIs, so the same folder works in all four browsers.

1. Open the extensions page: `chrome://extensions`, `edge://extensions`, `brave://extensions`, or `opera://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select the `extension` folder (the one that contains `manifest.json`).
4. Check that the ID shown is **`cpcgbbapickecmjkmnjggebigfebgkbj`**. The Gmail sign-in depends on this ID.
   The `key` in `manifest.json` fixes it, so it should match in every browser.
5. Pin Stopbill and open the popup.

The checklist works with no setup. Gmail scanning needs the Google setup below.

## Gmail scan: setup (developer, one time)

The scan signs in with Google through a browser sign-in window (`chrome.identity.launchWebAuthFlow`) and asks for the
read-only Gmail scope `https://www.googleapis.com/auth/gmail.readonly`.

1. In Google Cloud Console, create a project and enable the **Gmail API**.
2. Set up the **OAuth consent screen**: external, the app name, and the scope above. Add each tester's Google account as a
   **test user**. Until Google verifies the app, only test users can sign in.
3. Under **Credentials**, create an **OAuth client ID** of type **Web application**. Under **Authorized redirect URIs**, add
   exactly:
   ```
   https://cpcgbbapickecmjkmnjggebigfebgkbj.chromiumapp.org/
   ```
4. Copy the client ID into `extension/lib/config.js`, replacing `REPLACE_WITH_WEB_CLIENT_ID`.
5. Reload the extension on its extensions page.

Each scan opens Google's account chooser, so you can scan more than one account. Each account's results are kept
separately, and the email lookup shows the results for the address you type.

**Verification and security review.** Gmail read access is a restricted scope. Google requires app verification
before public release, and it may ask for a yearly third-party security assessment (CASA) for apps that send restricted data
through a server. This design sends data only from the browser to Gmail, with no Stopbill server. Confirm with Google
that this avoids the assessment before launch.

**Implicit flow.** The sign-in uses the implicit grant (the token comes back in the redirect). Google still documents it for
browser apps, but check its current status before launch.

## Guardrails (keep these true)

- **Minimal reach.** `extension/manifest.json` may ask only for `storage` and `identity`, with host access to
  `https://gmail.googleapis.com/*`. There are no content scripts and no background page. `scripts/package-extension.mjs`
  fails the build if this changes, and the tests check it too.
- **Read-only, narrow Gmail queries.** Only AI-service billing senders and billing words are searched. Only the sender,
  subject, date, and snippet are requested. Message bodies and attachments are never requested.
- **Tokens stay in session storage** and are cleared when the browser closes or the token expires. A 401 from Gmail
  clears the token.
- **No credentials, no server.** Stored in `chrome.storage.local`: the billing channel, checklist progress, an optional
  end date, and scan results. Nothing is sent to a Stopbill server.
- **No automated clicks on third-party services.** Each cancel step is a checklist item the customer completes.
  OpenAI's Terms of Use prohibit automated or programmatic extraction of data or output from its services, so the
  ChatGPT steps are guided only.
- **Claims stay within the product.** Copy must not promise refunds, guaranteed cancellation, or legal compliance.
  `src/lib/site.ts` is the single place for copy.

## Adding another AI tool

1. Confirm its terms of service and get legal review. Write down what the review allowed.
2. Add a flow to `extension/lib/flows.js` with steps the customer performs, plus a help link on that provider's domain.
3. Add the provider's sender domains and keywords to `extension/lib/subscriptions.js` (`SERVICES`).
4. Add tests in `tests/`, and update the copy in `src/lib/site.ts`.

## Before launch

- Legal review of the guided flow, the Gmail scan, the terms of service, and the privacy policy. Neither document is in the repo yet.
- Confirm each ChatGPT step against the live OpenAI pages. The labels in `flows.js` come from OpenAI's help center and may change.
- Check the sender domains and search terms in `subscriptions.js` against real receipts.
- Test on Brave and Opera with a real Google account. Only Chromium-based browsers with the `identity` API are covered.
- Decide where the extension will be distributed (Chrome Web Store or zip).
- Replace the placeholder contact email in `src/lib/site.ts`, and confirm the `stopbill.dev` domain.
- The brand name "Stopbill" is a placeholder. Change it in `src/lib/site.ts` and `extension/manifest.json`.

## Known gaps

- Scans read the first 100 matching messages from the last 365 days.
- Apple subscriptions show up only when Apple sends the receipt to a scanned Gmail address.
- Gmail scanning works for test users until Google verifies the app.
- Only ChatGPT is supported for cancellation. Only the web flow opens a page for the customer.
- Tested in Chromium-based browser APIs with stubs and in the popup layout. Not yet tested with a real Google account
  in Chrome, Edge, Brave, or Opera.
- No reminder notifications.
