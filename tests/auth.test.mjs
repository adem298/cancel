import { describe, expect, it } from 'vitest';
import { AUTH_ENDPOINT, buildAuthUrl, isFresh, newState, parseRedirect } from '../extension/lib/auth.js';
import { GMAIL_SCOPE } from '../extension/lib/gmail.js';

const REDIRECT = 'https://cpcgbbapickecmjkmnjggebigfebgkbj.chromiumapp.org/';

describe('buildAuthUrl', () => {
  const url = new URL(buildAuthUrl({ clientId: 'cid.apps.googleusercontent.com', redirectUri: REDIRECT, state: 'st1' }));

  it('uses Google’s OAuth endpoint with the implicit token response', () => {
    expect(`${url.origin}${url.pathname}`).toBe(AUTH_ENDPOINT);
    expect(url.searchParams.get('response_type')).toBe('token');
  });

  it('requests only the read-only Gmail scope', () => {
    expect(url.searchParams.get('scope')).toBe(GMAIL_SCOPE);
    expect(GMAIL_SCOPE).toBe('https://www.googleapis.com/auth/gmail.readonly');
  });

  it('lets the user pick any Google account, and carries the state and redirect', () => {
    expect(url.searchParams.get('prompt')).toBe('select_account');
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT);
    expect(url.searchParams.get('client_id')).toBe('cid.apps.googleusercontent.com');
    expect(url.searchParams.get('state')).toBe('st1');
  });
});

describe('newState', () => {
  it('is unique per call and starts with a letter', () => {
    const a = newState();
    const b = newState();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^s/);
  });
});

describe('parseRedirect', () => {
  const ok = (extra = '') => `${REDIRECT}#access_token=ya29.abc&token_type=Bearer&expires_in=3600&state=st1${extra}`;

  it('returns the token and an expiry a little before Google’s', () => {
    const now = 1_000_000;
    const out = parseRedirect(ok(), 'st1', now);
    expect(out.accessToken).toBe('ya29.abc');
    expect(out.expiresAt).toBe(now + (3600 - 60) * 1000);
  });

  it('rejects a state mismatch (possible forged redirect)', () => {
    expect(() => parseRedirect(ok(), 'other')).toThrow(/did not match/);
  });

  it('explains when the user declines access', () => {
    expect(() => parseRedirect(`${REDIRECT}#error=access_denied&state=st1`, 'st1')).toThrow(/declined/);
  });

  it('reports a cancelled window when no redirect URL comes back', () => {
    expect(() => parseRedirect(undefined, 'st1')).toThrow(/cancelled/);
  });

  it('rejects a redirect with no access token', () => {
    expect(() => parseRedirect(`${REDIRECT}#state=st1`, 'st1')).toThrow(/access token/);
  });
});

describe('isFresh', () => {
  it('is true only for a token that has not expired', () => {
    expect(isFresh({ accessToken: 't', expiresAt: 2000 }, 1000)).toBe(true);
    expect(isFresh({ accessToken: 't', expiresAt: 500 }, 1000)).toBe(false);
    expect(isFresh(null, 1000)).toBe(false);
  });
});
