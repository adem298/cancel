/**
 * Guided cancellation flows. Pure data and pure functions, so they can be tested without a browser.
 *
 * Stopbill never clicks, types, or reads pages for the customer. Each step is a
 * checklist item the customer completes in their own browser. A step may open a
 * page for them (`open`), and a step may ask for a date they read on screen (`endDate`).
 */

export const SERVICE = { id: 'chatgpt', name: 'ChatGPT' };

export const CHANNELS = [
  { id: 'web', label: 'chatgpt.com (web)', flowId: 'chatgpt-web' },
  { id: 'apple', label: 'iPhone or iPad app (Apple)', flowId: 'chatgpt-apple' },
  { id: 'google', label: 'Android app (Google Play)', flowId: 'chatgpt-google' },
  { id: 'unsure', label: 'Not sure', flowId: null },
];

const OPENAI_HELP_URL = 'https://help.openai.com/en/articles/7232927-how-do-i-cancel-my-chatgpt-plus-subscription';

export const FLOWS = {
  'chatgpt-web': {
    id: 'chatgpt-web',
    title: 'Cancel ChatGPT billed on chatgpt.com',
    helpUrl: OPENAI_HELP_URL,
    steps: [
      { id: 'open', label: 'Sign in to ChatGPT with the account you paid with', open: { url: 'https://chatgpt.com/', buttonLabel: 'Open ChatGPT' } },
      { id: 'settings', label: 'Open your account menu and select Settings' },
      { id: 'billing', label: 'Select Billing' },
      { id: 'cancel', label: 'Under "Cancel plan", select Cancel, then confirm' },
      { id: 'end-date', label: 'Write down the date your paid access ends', endDate: true },
    ],
    notes: [
      'You click every step yourself. Stopbill does not click, type, or read the page for you.',
      'Cancel at least 24 hours before your next billing date to avoid the next charge.',
      'If the labels on your screen differ, follow OpenAI’s help article.',
    ],
  },
  'chatgpt-apple': {
    id: 'chatgpt-apple',
    title: 'Cancel ChatGPT billed by Apple',
    helpUrl: OPENAI_HELP_URL,
    steps: [
      { id: 'settings', label: 'On your iPhone or iPad, open the Settings app and tap your name' },
      { id: 'subscriptions', label: 'Tap Subscriptions, then ChatGPT' },
      { id: 'cancel', label: 'Tap Cancel Subscription, then confirm', },
      { id: 'end-date', label: 'Write down the date your paid access ends', endDate: true },
    ],
    notes: [
      'Deleting the ChatGPT app does not cancel an Apple subscription.',
      'If Cancel Subscription is missing and an expiry date shows, it may already be cancelled.',
    ],
  },
  'chatgpt-google': {
    id: 'chatgpt-google',
    title: 'Cancel ChatGPT billed by Google Play',
    helpUrl: OPENAI_HELP_URL,
    steps: [
      { id: 'play', label: 'Sign in to the Google account you paid with, then open the Google Play Store' },
      { id: 'subscriptions', label: 'Open Menu, then Subscriptions, then ChatGPT' },
      { id: 'cancel', label: 'Tap Cancel subscription and follow the prompts' },
      { id: 'end-date', label: 'Write down the date your paid access ends', endDate: true },
    ],
    notes: ['Deleting the ChatGPT app does not cancel a Google Play subscription.'],
  },
};

/** The flow for a billing channel, or null when the channel is unknown or unsure. */
export function flowFor(channelId) {
  const channel = CHANNELS.find((c) => c.id === channelId);
  return channel && channel.flowId ? FLOWS[channel.flowId] : null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function emptyProgress(channelId = null) {
  return { channel: channelId, done: [], endDate: '' };
}

/** Returns a new progress object with one step toggled on or off. */
export function toggleStep(progress, stepId) {
  const done = progress.done.includes(stepId)
    ? progress.done.filter((id) => id !== stepId)
    : [...progress.done, stepId];
  return { ...progress, done };
}

/** Returns a new progress object with the end date set. Empty clears it. Throws on a malformed date. */
export function setEndDate(progress, value) {
  if (value !== '' && !DATE_PATTERN.test(value)) {
    throw new Error('End date must look like YYYY-MM-DD.');
  }
  return { ...progress, endDate: value };
}

export function isComplete(flow, progress) {
  return flow.steps.every((step) => progress.done.includes(step.id));
}

/** Index of the first step not yet done, or -1 when all are done. */
export function nextStepIndex(flow, progress) {
  return flow.steps.findIndex((step) => !progress.done.includes(step.id));
}
