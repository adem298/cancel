import {
  CHANNELS,
  emptyProgress,
  flowFor,
  isComplete,
  nextStepIndex,
  setEndDate,
  toggleStep,
} from './lib/flows.js';
import { GOOGLE_CLIENT_ID } from './lib/config.js';
import { buildAuthUrl, isFresh, newState, parseRedirect } from './lib/auth.js';
import { GmailError, getManyMetadata, getProfile, listMessageIds } from './lib/gmail.js';
import { buildQuery, classify, dedupeLatest, normalizeEmail, summarize } from './lib/subscriptions.js';

const PROGRESS_KEY = 'progress';
const MAILBOXES_KEY = 'mailboxes';
const SESSION_KEY = 'gmailSession';

const channelsEl = document.getElementById('channels');
const flowEl = document.getElementById('flow');
const resetBtn = document.getElementById('reset');
const scanBtn = document.getElementById('scan');
const scanStatus = document.getElementById('scan-status');
const lookupForm = document.getElementById('lookup-form');
const lookupInput = document.getElementById('lookup-email');
const lookupResult = document.getElementById('lookup-result');

let progress = emptyProgress();
let mailboxes = {};

async function loadState() {
  const stored = await chrome.storage.local.get([PROGRESS_KEY, MAILBOXES_KEY]);
  progress = stored[PROGRESS_KEY] ?? emptyProgress();
  mailboxes = stored[MAILBOXES_KEY] ?? {};
}

async function saveProgress() {
  await chrome.storage.local.set({ [PROGRESS_KEY]: progress });
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'text') node.textContent = value;
    else if (key === 'className') node.className = value;
    else if (key.includes('-')) node.setAttribute(key, value);
    else node[key] = value;
  }
  for (const child of children) node.append(child);
  return node;
}

function openTab(url) {
  chrome.tabs.create({ url });
}

/* ---------- Guided cancellation checklist ---------- */

function renderChannels() {
  channelsEl.replaceChildren(
    ...CHANNELS.map((channel) => {
      const input = el('input', { type: 'radio', name: 'channel', value: channel.id, checked: progress.channel === channel.id });
      input.addEventListener('change', async () => {
        progress = emptyProgress(channel.id);
        await saveProgress();
        render();
      });
      return el('label', { className: 'option' }, [input, el('span', { text: channel.label })]);
    }),
  );
}

function renderSteps(flow) {
  const current = nextStepIndex(flow, progress);
  const items = flow.steps.map((step, index) => {
    const checkbox = el('input', { type: 'checkbox', checked: progress.done.includes(step.id) });
    checkbox.addEventListener('change', async () => {
      progress = toggleStep(progress, step.id);
      await saveProgress();
      render();
    });

    const content = [el('span', { text: step.label })];
    if (step.open) {
      content.push(
        el('div', {}, [
          el('button', { type: 'button', text: step.open.buttonLabel, onclick: () => openTab(step.open.url) }),
        ]),
      );
    }
    if (step.endDate) {
      const date = el('input', { type: 'date', value: progress.endDate, 'aria-label': 'Access end date' });
      date.addEventListener('change', async () => {
        try {
          progress = setEndDate(progress, date.value);
          await saveProgress();
        } catch {
          date.value = progress.endDate;
        }
        render();
      });
      content.push(date);
    }

    const label = el('label', {}, [checkbox, el('div', {}, content)]);
    return el('li', { className: index === current ? 'current' : '' }, [
      el('span', { className: 'badge', text: index === current ? 'Next' : `Step ${index + 1}` }),
      label,
    ]);
  });
  return el('ol', { className: 'steps' }, items);
}

function renderFlow() {
  const flow = flowFor(progress.channel);
  if (!progress.channel) {
    return el('p', { className: 'muted', text: 'Choose where you pay, and Stopbill will show the steps.' });
  }
  if (progress.channel === 'unsure') {
    return el('div', { className: 'unsure' }, [
      el('p', { text: 'Check your bank or card statement. The charge is labelled:' }),
      el('ul', { className: 'notes' }, [
        el('li', { text: '“OpenAI” or “chatgpt.com”: cancel on the web (choose the web option).' }),
        el('li', { text: '“Apple”: cancel in iPhone or iPad Settings.' }),
        el('li', { text: '“Google”: cancel in Google Play.' }),
      ]),
    ]);
  }
  if (!flow) return el('p', { className: 'muted', text: 'No steps for this option yet.' });

  const children = [el('h3', { text: flow.title }), renderSteps(flow)];
  if (isComplete(flow, progress)) {
    children.push(
      el('div', { className: 'done' }, [
        el('p', { text: 'All steps are checked.' }),
        el('p', { className: 'muted', text: 'Reload your billing page once to confirm the cancellation appears before you rely on it.' }),
      ]),
    );
  }
  children.push(
    el('ul', { className: 'notes' }, flow.notes.map((note) => el('li', { text: note }))),
    el('p', { className: 'muted' }, [
      el('button', { type: 'button', className: 'link', text: 'OpenAI help article', onclick: () => openTab(flow.helpUrl) }),
    ]),
  );
  return el('div', {}, children);
}

/* ---------- Gmail sign-in, scan, and lookup by email ---------- */

const callChrome = (fn, ...args) =>
  new Promise((resolve, reject) => {
    fn(...args, (result) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(result);
    });
  });

function setScanStatus(text, tone = '') {
  scanStatus.textContent = text;
  scanStatus.className = `status ${tone}`.trim();
}

function formatDate(iso) {
  if (!iso) return 'date unknown';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** The Gmail token is kept in session storage: it is cleared when the browser closes. */
async function loadSession() {
  if (!chrome.storage.session) throw new Error('This browser is too old for Stopbill. Use Chrome, Edge, Brave, or Opera.');
  const stored = await chrome.storage.session.get(SESSION_KEY);
  return stored[SESSION_KEY] ?? null;
}

async function saveSession(session) {
  await chrome.storage.session.set({ [SESSION_KEY]: session });
}

async function connectGmail() {
  if (GOOGLE_CLIENT_ID.startsWith('REPLACE_')) {
    throw new Error('Gmail scanning is not set up yet. Add the Google client ID (see README).');
  }
  const state = newState();
  const url = buildAuthUrl({ clientId: GOOGLE_CLIENT_ID, redirectUri: chrome.identity.getRedirectURL(), state });
  const redirected = await callChrome(chrome.identity.launchWebAuthFlow, { url, interactive: true });
  const session = parseRedirect(redirected, state);
  await saveSession(session);
  return session;
}

async function scanMailbox() {
  scanBtn.disabled = true;
  setScanStatus('Scanning… this can take a minute.');
  try {
    let session = await loadSession();
    if (!isFresh(session)) {
      setScanStatus('Opening Google sign-in…');
      session = await connectGmail();
    }
    const token = session.accessToken;

    let email;
    let ids;
    try {
      email = normalizeEmail(await getProfile(token));
      if (!email) throw new Error('Google did not return an email address for this account.');
      ids = await listMessageIds(token, buildQuery(365));
    } catch (err) {
      if (err instanceof GmailError && err.status === 401) await chrome.storage.session.remove(SESSION_KEY);
      throw err;
    }
    const messages = ids.length ? await getManyMetadata(token, ids) : [];
    const summaries = messages.map(summarize);
    const records = summaries.map(classify).filter(Boolean);
    // Matches the search returned but that were not recognised as receipts. Shown so the rules can be checked.
    const unrecognised = summaries
      .filter((s, i) => !classify(s))
      .slice(0, 20)
      .map((s) => ({ from: s.from, subject: s.subject, date: s.date }));

    mailboxes = {
      ...mailboxes,
      [email]: {
        scannedAt: new Date().toISOString(),
        scanned: ids.length,
        subscriptions: dedupeLatest(records),
        unrecognised,
      },
    };
    await chrome.storage.local.set({ [MAILBOXES_KEY]: mailboxes });

    const found = mailboxes[email].subscriptions.length;
    const note = found === 0 && ids.length > 0 ? ' Emails were matched but none looked like a receipt. Details are below.' : '';
    setScanStatus(`Scanned ${ids.length} receipts for ${email}. Found ${found} AI subscription${found === 1 ? '' : 's'}.${note}`);
    lookupInput.value = email;
    renderLookup();
  } catch (err) {
    setScanStatus(err.message || 'Scan failed. Try again.', 'warn');
  } finally {
    scanBtn.disabled = false;
  }
}

function renderLookup() {
  const typed = lookupInput.value.trim();
  if (!typed) {
    lookupResult.replaceChildren();
    return;
  }
  const email = normalizeEmail(typed);
  if (!email) {
    lookupResult.replaceChildren(el('p', { className: 'warn', text: 'Enter a valid email address.' }));
    return;
  }
  const mailbox = mailboxes[email];
  if (!mailbox) {
    lookupResult.replaceChildren(
      el('p', { className: 'muted', text: `No scan for ${email} yet. Click Scan and choose that Google account.` }),
    );
    return;
  }
  if (mailbox.subscriptions.length === 0) {
    const children = [
      el('p', { className: 'muted', text: `No AI-service receipts found for ${email} in the last year (scanned ${formatDate(mailbox.scannedAt)}).` }),
    ];
    const unrecognised = mailbox.unrecognised ?? [];
    if (unrecognised.length) {
      children.push(
        el('p', { className: 'muted', text: `Matched but not recognised as receipts (${unrecognised.length} shown):` }),
        el('ul', { className: 'subs-list' }, unrecognised.map((m) =>
          el('li', {}, [
            el('div', { text: m.subject || '(no subject)' }),
            el('div', { className: 'meta', text: `From: ${m.from || 'unknown'}` }),
            el('div', { className: 'meta', text: `Date: ${formatDate(m.date)}` }),
          ]),
        )),
      );
    }
    lookupResult.replaceChildren(...children);
    return;
  }
  lookupResult.replaceChildren(
    el('ul', { className: 'subs-list' }, mailbox.subscriptions.map((sub) =>
      el('li', {}, [
        el('div', { text: `${sub.serviceName} · ${sub.channel === 'apple' ? 'Apple billing' : 'web billing'}` }),
        el('div', { className: 'meta', text: `Last receipt ${formatDate(sub.date)}` }),
        el('div', { className: 'meta', text: sub.subject || '(no subject)' }),
      ]),
    )),
    el('p', { className: 'muted', text: 'Apple receipts appear only when Apple sends them to this Gmail address.' }),
  );
}

/* ---------- Wiring ---------- */

function render() {
  renderChannels();
  flowEl.replaceChildren(renderFlow());
}

resetBtn.addEventListener('click', async () => {
  progress = emptyProgress();
  await saveProgress();
  render();
});

scanBtn.addEventListener('click', scanMailbox);
lookupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  renderLookup();
});

await loadState();
render();
renderLookup();
