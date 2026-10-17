/**
 * Google OAuth client for the Gmail scan.
 *
 * Create a client of type "Web application" in Google Cloud Console, and add this exact redirect URI:
 *   https://cpcgbbapickecmjkmnjggebigfebgkbj.chromiumapp.org/
 * The extension ID is fixed by the "key" in manifest.json, so the same URI works in Chrome, Edge, Brave, and Opera.
 * Replace the placeholder below with the client ID from Google Cloud. See README.
 */
export const GOOGLE_CLIENT_ID = 'REPLACE_WITH_WEB_CLIENT_ID.apps.googleusercontent.com';
