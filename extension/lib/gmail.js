/**
 * Minimal Gmail API calls made directly from the browser. No server is involved.
 * The token comes from chrome.identity. Only read calls are made.
 */

export const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

export class GmailError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'GmailError';
    this.status = status;
  }
}

async function getJson(url, token, fetchFn) {
  const res = await fetchFn(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const reason = res.status === 401 ? 'Google sign-in expired. Scan again.' : `Gmail returned ${res.status}.`;
    throw new GmailError(res.status, reason);
  }
  return res.json();
}

/** Message ids matching the query. Only the first page (up to `max`) is read. */
export async function listMessageIds(token, query, { fetchFn = fetch, max = 100 } = {}) {
  const url = `${GMAIL_API}/messages?q=${encodeURIComponent(query)}&maxResults=${max}`;
  const data = await getJson(url, token, fetchFn);
  return (data.messages ?? []).map((m) => m.id);
}

/** Headers and snippet for one message. Bodies and attachments are not requested. */
export async function getMessageMetadata(token, id, { fetchFn = fetch } = {}) {
  const params = new URLSearchParams({ format: 'metadata' });
  for (const h of ['From', 'Subject', 'Date']) params.append('metadataHeaders', h);
  return getJson(`${GMAIL_API}/messages/${encodeURIComponent(id)}?${params}`, token, fetchFn);
}

/** Fetches metadata for many ids, `concurrency` at a time. */
export async function getManyMetadata(token, ids, { fetchFn = fetch, concurrency = 10 } = {}) {
  const out = [];
  for (let i = 0; i < ids.length; i += concurrency) {
    const batch = ids.slice(i, i + concurrency);
    out.push(...(await Promise.all(batch.map((id) => getMessageMetadata(token, id, { fetchFn })))));
  }
  return out;
}

/** The email address of the account that the token belongs to. */
export async function getProfile(token, { fetchFn = fetch } = {}) {
  const data = await getJson(`${GMAIL_API}/profile`, token, fetchFn);
  return typeof data.emailAddress === 'string' ? data.emailAddress : null;
}
