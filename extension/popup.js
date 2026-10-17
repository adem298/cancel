import { ADAPTERS } from './adapters.js';

const { apiBase } = window.STOPBILL_CONFIG;
const $ = (id) => document.getElementById(id);
const DEVICE_KEY = 'deviceId';
const SESSION_KEYS = ['token', 'expiresAt', 'deviceId'];

let flow = null; // { adapter, index, tabId }

function say(text, tone = 'info') {
  const el = $('message');
  el.textContent = text;
  el.dataset.tone = tone;
}

function showOnly(id) {
  for (const section of ['activate', 'active']) $(section).hidden = section !== id;
}

async function errorText(res) {
  try {
    const body = await res.json();
    return body.error || `Request failed (${res.status}).`;
  } catch {
    return `Request failed (${res.status}).`;
  }
}

async function loadStored() {
  return chrome.storage.local.get(SESSION_KEYS);
}

async function init() {
  const saved = await loadStored();
  if (saved.token && saved.expiresAt && Date.parse(saved.expiresAt) > Date.now()) {
    await refreshStatus(saved.token);
  } else {
    showActivate();
  }
}

function showActivate() {
  showOnly('activate');
  $('badge').hidden = true;
}

async function refreshStatus(token) {
  let res;
  try {
    res = await fetch(`${apiBase}/api/license/status`, { headers: { authorization: `Bearer ${token}` } });
  } catch {
    say('Could not reach Stopbill. Check your connection and try again.', 'error');
    showOnly('active');
    return;
  }
  if (!res.ok) {
    await chrome.storage.local.remove(['token', 'expiresAt']);
    showActivate();
    say(await errorText(res), 'error');
    return;
  }
  const status = await res.json();
  $('status').textContent = `Active on ${status.devicesUsed} of ${status.maxDevices} devices.`;
  $('badge').textContent = 'Licensed';
  $('badge').hidden = false;
  showOnly('active');
  renderAdapters();
}

$('activate-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('activate-btn');
  button.disabled = true;
  say('Activating…');
  try {
    const saved = await loadStored();
    const deviceId = saved[DEVICE_KEY] ?? crypto.randomUUID();
    const res = await fetch(`${apiBase}/api/license/activate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ licenseKey: $('key').value, deviceId }),
    });
    if (!res.ok) {
      say(await errorText(res), 'error');
      return;
    }
    const body = await res.json();
    await chrome.storage.local.set({ token: body.token, expiresAt: body.expiresAt, deviceId });
    $('key').value = '';
    say('Activated.', 'success');
    await refreshStatus(body.token);
  } catch {
    say('Could not reach Stopbill. Check your connection and try again.', 'error');
  } finally {
    button.disabled = false;
  }
});

$('sign-out').addEventListener('click', async () => {
  await chrome.storage.local.remove(['token', 'expiresAt']);
  say('Signed out on this device.');
  showActivate();
});

function renderAdapters() {
  const root = $('adapters');
  root.replaceChildren();
  if (ADAPTERS.length === 0) {
    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent = 'No services are enabled yet. A service is added only after its terms have been reviewed.';
    root.append(note);
    return;
  }
  for (const adapter of ADAPTERS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = adapter.name;
    button.addEventListener('click', () => startFlow(adapter));
    root.append(button);
  }
}

async function startFlow(adapter) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const host = tab?.url ? new URL(tab.url).hostname : '';
  if (!adapter.hosts.includes(host)) {
    say(`Open ${adapter.hosts[0]} in this tab first.`, 'error');
    return;
  }
  flow = { adapter, index: 0, tabId: tab.id };
  renderStep();
}

function renderStep() {
  if (!flow) return;
  const { adapter, index } = flow;
  const step = adapter.steps[index];
  if (!step) {
    say('All steps are done. Check the service to confirm the cancellation.', 'success');
    stopFlow();
    return;
  }
  $('flow').hidden = false;
  $('step-label').textContent = `Step ${index + 1} of ${adapter.steps.length}: ${step.label}`;
  $('run-step').onclick = () => runStep(step);
}

function stopFlow() {
  flow = null;
  $('flow').hidden = true;
}

$('exit-flow').addEventListener('click', () => {
  stopFlow();
  say('Stopped. Nothing else was changed.');
});

async function runStep(step) {
  if (!flow) return;
  const { tabId } = flow;
  try {
    if (step.url) {
      await chrome.tabs.update(tabId, { url: step.url });
    } else {
      // activeTab grants access to this tab after the customer's click. Only the approved selector runs.
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
      const result = await chrome.tabs.sendMessage(tabId, { type: 'stopbill:click', selector: step.selector });
      if (!result?.ok) {
        say(result?.error ?? 'This step did not run. Do it manually, then continue.', 'error');
        return;
      }
    }
    flow.index += 1;
    say('Step done.', 'success');
    renderStep();
  } catch {
    say('This step did not run. Check the page, then try again.', 'error');
  }
}

init();
