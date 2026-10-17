import { describe, expect, it } from 'vitest';
import { buildQuery, classify, dedupeLatest, normalizeEmail, senderDomain, summarize } from '../extension/lib/subscriptions.js';

const msg = (from, subject, snippet = '', internalDate = '1760000000000') => ({
  id: `id-${from}-${subject}`.replace(/\s+/g, '-'),
  snippet,
  internalDate,
  payload: { headers: [{ name: 'From', value: from }, { name: 'Subject', value: subject }] },
});

describe('normalizeEmail', () => {
  it('trims, lowercases, and rejects non-addresses', () => {
    expect(normalizeEmail('  Me@Example.COM ')).toBe('me@example.com');
    expect(normalizeEmail('not an email')).toBeNull();
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});

describe('senderDomain', () => {
  it('reads the domain from display-name and bare addresses', () => {
    expect(senderDomain('ChatGPT <noreply@tm.openai.com>')).toBe('tm.openai.com');
    expect(senderDomain('billing@Anthropic.com')).toBe('anthropic.com');
    expect(senderDomain('no address here')).toBeNull();
  });
});

describe('summarize', () => {
  it('extracts headers, snippet, and an ISO date from internalDate', () => {
    const s = summarize(msg('a@openai.com', 'Your receipt', 'ChatGPT Plus', '1760000000000'));
    expect(s.from).toBe('a@openai.com');
    expect(s.subject).toBe('Your receipt');
    expect(s.snippet).toBe('ChatGPT Plus');
    expect(s.date).toBe(new Date(1760000000000).toISOString());
  });

  it('falls back to the Date header, and to null when neither is usable', () => {
    const withDate = { id: 'x', internalDate: '0', payload: { headers: [{ name: 'Date', value: 'Mon, 05 Oct 2026 10:00:00 +0000' }] } };
    expect(summarize(withDate).date).toBe(new Date('Mon, 05 Oct 2026 10:00:00 +0000').toISOString());
    expect(summarize({ id: 'y', payload: { headers: [] } }).date).toBeNull();
  });
});

describe('classify', () => {
  it('matches an OpenAI receipt by sender domain and a billing word', () => {
    const r = classify(summarize(msg('ChatGPT <noreply@tm.openai.com>', 'Your ChatGPT Plus receipt')));
    expect(r).toMatchObject({ serviceId: 'chatgpt', serviceName: 'ChatGPT', channel: 'web' });
  });

  it('matches an Anthropic invoice by domain', () => {
    const r = classify(summarize(msg('billing@anthropic.com', 'Your invoice is ready')));
    expect(r).toMatchObject({ serviceId: 'claude', channel: 'web' });
  });

  it('matches an Apple receipt for ChatGPT using the snippet, and marks the channel as apple', () => {
    const r = classify(summarize(msg('Apple <do_not_reply@email.apple.com>', 'Your receipt from Apple.', 'ChatGPT Plus 1 month renews')));
    expect(r).toMatchObject({ serviceId: 'chatgpt', channel: 'apple' });
  });

  it('ignores an Apple receipt that names no AI service', () => {
    expect(classify(summarize(msg('Apple <do_not_reply@email.apple.com>', 'Your receipt from Apple.', 'iCloud+ 50GB')))).toBeNull();
  });

  it('ignores Google mail that is not about Gemini, even with a billing word', () => {
    expect(classify(summarize(msg('Google One <payments-noreply@google.com>', 'Your receipt', 'Google One 2TB')))).toBeNull();
  });

  it('matches Gemini only when the Google sender and a Gemini name both appear', () => {
    expect(classify(summarize(msg('Google <payments-noreply@google.com>', 'Your Google AI Pro receipt', 'Gemini Advanced')))).toMatchObject({ serviceId: 'gemini' });
  });

  it('ignores newsletters with no billing word', () => {
    expect(classify(summarize(msg('news@openai.com', 'What is new in ChatGPT this month', 'Read our update')))).toBeNull();
  });

  it('ignores a billing word from a sender that is not an AI service', () => {
    expect(classify(summarize(msg('shop@example.com', 'Your receipt for ChatGPT merch', 'Thanks for your order')))).toBeNull();
  });

  it('does not match a lookalike domain', () => {
    expect(classify(summarize(msg('bill@notopenai.com', 'Your receipt', 'ChatGPT')))).toBeNull();
  });
});

describe('dedupeLatest', () => {
  it('keeps the newest receipt per service and channel, sorted by name', () => {
    const rows = dedupeLatest([
      { serviceId: 'claude', serviceName: 'Claude', channel: 'web', date: '2026-01-01T00:00:00.000Z', subject: 'old' },
      { serviceId: 'claude', serviceName: 'Claude', channel: 'web', date: '2026-03-01T00:00:00.000Z', subject: 'new' },
      { serviceId: 'chatgpt', serviceName: 'ChatGPT', channel: 'apple', date: '2026-02-01T00:00:00.000Z', subject: 'apple' },
    ]);
    expect(rows.map((r) => r.subject)).toEqual(['apple', 'new']);
    expect(rows[0].serviceName).toBe('ChatGPT');
  });
});

describe('buildQuery', () => {
  it('searches only the known AI-service and Apple senders, with billing words and a date limit', () => {
    const q = buildQuery(90);
    for (const domain of ['from:openai.com', 'from:anthropic.com', 'from:google.com', 'from:perplexity.ai', 'from:email.apple.com']) {
      expect(q).toContain(domain);
    }
    expect(q).toContain('"receipt"');
    expect(q).toContain('newer_than:90d');
  });
});
