/**
 * Site-wide configuration and copy. Brand, contact, and claims live here so they can be
 * reviewed in one place. Keep every claim here within what the extension actually does.
 */

export const BRAND = {
  name: 'Stopbill',
  tagline: 'Cancel ChatGPT in a few guided steps.',
  domain: 'stopbill.dev',
  contactEmail: 'hello@stopbill.dev',
  extensionZip: '/downloads/stopbill-extension.zip',
} as const;

export const NAV_LINKS = [
  { href: '#channels', label: 'Billing channels' },
  { href: '#steps', label: 'How it works' },
  { href: '#limits', label: 'Limits' },
  { href: '#faq', label: 'FAQ' },
] as const;

export const CHANNEL_CARDS = [
  {
    title: 'chatgpt.com (web)',
    where: 'ChatGPT, then Settings, then Billing, then Cancel plan.',
    note: 'Stopbill opens ChatGPT for you. You make the clicks.',
  },
  {
    title: 'iPhone or iPad app',
    where: 'Settings, your name, Subscriptions, ChatGPT, Cancel Subscription.',
    note: 'Deleting the app does not cancel an Apple subscription.',
  },
  {
    title: 'Android app',
    where: 'Google Play, Menu, Subscriptions, ChatGPT, Cancel subscription.',
    note: 'Use the same Google account you paid with.',
  },
] as const;

export const STEPS = [
  { title: 'Pick where you pay', body: 'Choose web, Apple, or Google Play. Stopbill shows only the steps for that channel.' },
  { title: 'Follow the checklist', body: 'Each step is a checkbox. Stopbill can open ChatGPT for the web steps.' },
  { title: 'Click Cancel yourself', body: 'You select Cancel and confirm on the provider’s page. Stopbill never clicks for you.' },
  { title: 'Note the end date', body: 'Write down when your paid access ends, and check the billing page once.' },
] as const;

export const DOES = [
  'Shows the steps for where you pay, and tracks your progress',
  'Opens ChatGPT in a new tab when you ask it to',
  'Shows the rule to cancel at least 24 hours before renewal',
  'Keeps your checklist in this browser only',
] as const;

export const DOES_NOT = [
  'Click, type, or sign in for you',
  'Read your chats or the pages you visit (the extension has no page access)',
  'Store your password or any card details',
  'Send your data to a server. There is no Stopbill account or backend',
  'Promise a refund or guarantee that a subscription is cancelled',
] as const;

export const FAQ = [
  {
    question: 'Is Stopbill free?',
    answer: 'Yes. There is no payment in this version.',
  },
  {
    question: 'Does Stopbill cancel my subscription for me?',
    answer:
      'No. You make every click. Stopbill shows where to click and keeps track of which steps you have finished.',
  },
  {
    question: 'Why doesn’t Stopbill automate the ChatGPT steps?',
    answer:
      'OpenAI’s Terms of Use prohibit automated or programmatic extraction of data or output from its services. Stopbill therefore guides you instead of clicking for you.',
  },
  {
    question: 'Which AI tools are supported?',
    answer:
      'ChatGPT only, for now. Other tools will be added after their terms of service have been reviewed.',
  },
  {
    question: 'What data does the extension store?',
    answer:
      'Only your checklist progress, your billing channel, and an end date you enter. It is kept in your browser’s extension storage and is never sent anywhere.',
  },
  {
    question: 'Will Stopbill get me a refund?',
    answer:
      'No. Stopbill cannot promise a refund. Refund decisions belong to the provider, so check their policy.',
  },
  {
    question: 'Is this legal advice?',
    answer:
      'No. Stopbill is a tool, not legal advice. After cancelling, check your billing page to confirm the cancellation appears.',
  },
] as const;
