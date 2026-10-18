/**
 * Finds AI-service billing receipts in Gmail metadata (headers and snippet only).
 * Pure functions, so the rules can be tested without Gmail or a browser.
 *
 * A message counts only when BOTH hold:
 *  - the sender's domain belongs to the service (or Apple, for Apple receipts), and
 *  - the subject or snippet contains a billing word, and (for shared domains) the service's name.
 * Shared domains such as google.com send many unrelated emails, so they need the name too.
 */

export const SERVICES = [
  { id: 'chatgpt', name: 'ChatGPT', domains: ['openai.com'], keywords: ['chatgpt', 'chatgpt plus', 'chatgpt pro'], domainAlone: true },
  { id: 'claude', name: 'Claude', domains: ['anthropic.com'], keywords: ['claude'], domainAlone: true },
  { id: 'gemini', name: 'Gemini', domains: ['google.com'], keywords: ['gemini', 'google ai pro', 'google ai plus'], domainAlone: false },
  { id: 'perplexity', name: 'Perplexity', domains: ['perplexity.ai'], keywords: ['perplexity'], domainAlone: true },
];

/** Apple sends receipts from these domains. The service name is then taken from the text. */
export const APPLE_DOMAINS = ['email.apple.com', 'apple.com'];

export const BILLING_WORDS = ['receipt', 'invoice', 'subscription', 'renew', 'payment', 'charged', 'billing', 'your plan'];

const normalize = (value) => String(value ?? '').toLowerCase();

export function normalizeEmail(value) {
  const email = String(value ?? '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** Gmail search query for AI-service billing mail from the last `days` days. */
export function buildQuery(days = 365) {
  const senders = [...SERVICES.flatMap((s) => s.domains), ...APPLE_DOMAINS].map((d) => `from:${d}`).join(' OR ');
  const words = BILLING_WORDS.map((w) => `"${w}"`).join(' OR ');
  return `(${senders}) (${words}) newer_than:${days}d`;
}

/** Turns a Gmail message resource (format=metadata) into { id, from, subject, snippet, date }. */
export function summarize(message) {
  const headers = {};
  for (const h of message?.payload?.headers ?? []) headers[normalize(h.name)] = h.value ?? '';
  const internal = Number(message?.internalDate);
  let date = null;
  if (Number.isFinite(internal) && internal > 0) date = new Date(internal).toISOString();
  else if (headers.date && !Number.isNaN(Date.parse(headers.date))) date = new Date(headers.date).toISOString();
  return {
    id: message?.id ?? '',
    from: headers.from ?? '',
    subject: headers.subject ?? '',
    snippet: message?.snippet ?? '',
    date,
  };
}

/** The domain of the address inside a From header, lower-cased, or null. */
export function senderDomain(from) {
  const match = /<([^>]+)>/.exec(from) ?? /([^\s<>"]+@[^\s<>"]+)/.exec(from);
  if (!match) return null;
  const address = match[1] ?? match[0];
  const at = address.lastIndexOf('@');
  return at === -1 ? null : address.slice(at + 1).toLowerCase();
}

const domainMatches = (domain, list) => list.some((d) => domain === d || domain.endsWith(`.${d}`));
const hasWord = (text, words) => words.some((w) => text.includes(w));

/** Returns a subscription record for a receipt, or null when the message is not an AI-service receipt. */
export function classify(summary) {
  const domain = senderDomain(summary.from);
  if (!domain) return null;
  const text = normalize(`${summary.subject} ${summary.snippet}`);
  if (!hasWord(text, BILLING_WORDS)) return null;

  const fromApple = domainMatches(domain, APPLE_DOMAINS);
  let service = null;
  if (fromApple) {
    service = SERVICES.find((s) => hasWord(text, s.keywords)) ?? null;
  } else {
    service = SERVICES.find(
      (s) => domainMatches(domain, s.domains) && (s.domainAlone || hasWord(text, s.keywords)),
    ) ?? null;
  }
  if (!service) return null;

  return {
    serviceId: service.id,
    serviceName: service.name,
    channel: fromApple ? 'apple' : 'web',
    date: summary.date,
    subject: summary.subject,
    messageId: summary.id,
  };
}

/** One row per service and channel, keeping the most recent receipt. Sorted by service name. */
export function dedupeLatest(records) {
  const byKey = new Map();
  for (const record of records) {
    const key = `${record.serviceId}|${record.channel}`;
    const current = byKey.get(key);
    if (!current || String(record.date ?? '') > String(current.date ?? '')) byKey.set(key, record);
  }
  return [...byKey.values()].sort((a, b) => a.serviceName.localeCompare(b.serviceName) || a.channel.localeCompare(b.channel));
}
