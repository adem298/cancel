/**
 * Sign-in with Google using chrome.identity.launchWebAuthFlow, which works in every Chromium browser.
 * (chrome.identity.getAuthToken needs Google sign-in built into the browser, so it is not used.)
 * Uses the implicit grant: Google returns the access token in the redirect URL fragment.
 * Pure functions here; the browser call lives in popup.js.
 */

import { GMAIL_SCOPE } from './gmail.js';

export const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

/** Builds the Google sign-in URL. `prompt=select_account` lets the user choose any Google account in the browser. */
export function buildAuthUrl({ clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: GMAIL_SCOPE,
    state,
    prompt: 'select_account',
    include_granted_scopes: 'false',
  });
  return `${AUTH_ENDPOINT}?${params}`;
}

/** Random state for CSRF protection. */
export function newState(random = () => crypto.getRandomValues(new Uint32Array(4)).join('')) {
  return `s${random()}${Date.now().toString(36)}`;
}

/**
 * Reads the redirect URL that launchWebAuthFlow returns.
 * Returns { accessToken, expiresAt } on success. Throws on error, a state mismatch, or a missing token.
 */
export function parseRedirect(redirectUrl, expectedState, now = Date.now()) {
  if (!redirectUrl) throw new Error('Google sign-in was cancelled.');
  const hash = new URL(redirectUrl).hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  if (params.get('error')) {
    const reason = params.get('error') === 'access_denied' ? 'You declined access.' : `Google returned “${params.get('error')}”.`;
    throw new Error(`${reason} Connect again to scan.`);
  }
  if (params.get('state') !== expectedState) throw new Error('Sign-in response did not match this request. Try again.');
  const accessToken = params.get('access_token');
  if (!accessToken) throw new Error('Google did not return an access token. Try again.');
  const expiresIn = Number(params.get('expires_in') ?? 3600);
  return { accessToken, expiresAt: now + Math.max(60, expiresIn - 60) * 1000 };
}

export function isFresh(session, now = Date.now()) {
  return Boolean(session && session.accessToken && session.expiresAt > now);
}
