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

## Guardrails (keep these true)

- **No host access, no content scripts.** `extension/manifest.json` may ask only for `storage`.
  `scripts/package-extension.mjs` fails the build if host access or content scripts are added.
  Tests check this too.
- **No automated clicks on third-party services.** Each step is a checklist item the customer completes.
  OpenAI's Terms of Use prohibit automated or programmatic extraction of data or output from its services,
  so ChatGPT steps are guided only.
- **No credentials, no page reading.** The extension stores only the chosen billing channel, checklist
  progress, and an optional end date, in `chrome.storage.local`.
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

- Only ChatGPT is supported. Only the web flow opens a page for the customer.
- The end-date field is for the customer's own notes. Nothing checks it against the provider.
- No reminder notifications.
- The extension is not signed for the Chrome Web Store, so installs use Developer mode.
