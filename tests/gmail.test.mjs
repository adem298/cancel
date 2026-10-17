import { describe, expect, it } from 'vitest';
import { GMAIL_API, GmailError, getManyMetadata, getMessageMetadata, getProfile, listMessageIds } from '../extension/lib/gmail.js';

function fakeFetch(handler) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url: String(url), init });
    const { status = 200, body = {} } = handler(String(url)) ?? {};
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return { fn, calls };
}

describe('listMessageIds', () => {
  it('sends the query with a bearer token and returns ids', async () => {
    const { fn, calls } = fakeFetch(() => ({ body: { messages: [{ id: 'a' }, { id: 'b' }] } }));
    const ids = await listMessageIds('tok', 'from:openai.com receipt', { fetchFn: fn, max: 50 });
    expect(ids).toEqual(['a', 'b']);
    expect(calls[0].url).toBe(`${GMAIL_API}/messages?q=${encodeURIComponent('from:openai.com receipt')}&maxResults=50`);
    expect(calls[0].init.headers.Authorization).toBe('Bearer tok');
  });

  it('returns an empty list when Gmail finds nothing', async () => {
    const { fn } = fakeFetch(() => ({ body: { resultSizeEstimate: 0 } }));
    expect(await listMessageIds('tok', 'q', { fetchFn: fn })).toEqual([]);
  });

  it('throws a GmailError with a sign-in message on 401', async () => {
    const { fn } = fakeFetch(() => ({ status: 401, body: {} }));
    const err = await listMessageIds('bad', 'q', { fetchFn: fn }).catch((e) => e);
    expect(err).toBeInstanceOf(GmailError);
    expect(err.status).toBe(401);
    expect(err.message).toMatch(/Scan again/);
  });
});

describe('getMessageMetadata', () => {
  it('asks for metadata format with only From, Subject, and Date headers', async () => {
    const { fn, calls } = fakeFetch(() => ({ body: { id: 'a' } }));
    await getMessageMetadata('tok', 'a', { fetchFn: fn });
    const url = new URL(calls[0].url);
    expect(url.pathname.endsWith('/messages/a')).toBe(true);
    expect(url.searchParams.get('format')).toBe('metadata');
    expect(url.searchParams.getAll('metadataHeaders')).toEqual(['From', 'Subject', 'Date']);
  });
});

describe('getManyMetadata', () => {
  it('fetches every id in batches and keeps the order', async () => {
    const ids = Array.from({ length: 23 }, (_, i) => `m${i}`);
    const { fn, calls } = fakeFetch((url) => ({ body: { id: url.split('/messages/')[1].split('?')[0] } }));
    const out = await getManyMetadata('tok', ids, { fetchFn: fn, concurrency: 10 });
    expect(out.map((m) => m.id)).toEqual(ids);
    expect(calls).toHaveLength(23);
  });
});

describe('getProfile', () => {
  it('returns the signed-in account address', async () => {
    const { fn, calls } = fakeFetch(() => ({ body: { emailAddress: 'me@gmail.com', messagesTotal: 4 } }));
    expect(await getProfile('tok', { fetchFn: fn })).toBe('me@gmail.com');
    expect(calls[0].url).toBe(`${GMAIL_API}/profile`);
  });

  it('returns null when the response has no address', async () => {
    const { fn } = fakeFetch(() => ({ body: {} }));
    expect(await getProfile('tok', { fetchFn: fn })).toBeNull();
  });
});
