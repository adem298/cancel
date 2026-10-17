import {
  CHANNELS,
  emptyProgress,
  flowFor,
  isComplete,
  nextStepIndex,
  setEndDate,
  toggleStep,
} from './lib/flows.js';

const STORAGE_KEY = 'progress';

const channelsEl = document.getElementById('channels');
const flowEl = document.getElementById('flow');
const resetBtn = document.getElementById('reset');

let progress = emptyProgress();

async function load() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  progress = stored[STORAGE_KEY] ?? emptyProgress();
}

async function save() {
  await chrome.storage.local.set({ [STORAGE_KEY]: progress });
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

function renderChannels() {
  channelsEl.replaceChildren(
    ...CHANNELS.map((channel) => {
      const input = el('input', { type: 'radio', name: 'channel', value: channel.id, checked: progress.channel === channel.id });
      input.addEventListener('change', async () => {
        progress = emptyProgress(channel.id);
        await save();
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
      await save();
      render();
    });

    const content = [el('span', { text: step.label })];
    if (step.open) {
      content.push(
        el('div', {}, [
          el('button', {
            type: 'button',
            text: step.open.buttonLabel,
            onclick: () => openTab(step.open.url),
          }),
        ]),
      );
    }
    if (step.endDate) {
      const date = el('input', { type: 'date', value: progress.endDate, 'aria-label': 'Access end date' });
      date.addEventListener('change', async () => {
        try {
          progress = setEndDate(progress, date.value);
          await save();
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

function render() {
  renderChannels();
  flowEl.replaceChildren(renderFlow());
}

resetBtn.addEventListener('click', async () => {
  progress = emptyProgress();
  await save();
  render();
});

await load();
render();
