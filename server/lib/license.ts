import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

export const MAX_DEVICES = 2;
export const TOKEN_TTL_DAYS = 30;

// 32 characters with no 0, 1, I, L, or O, so keys are easy to read aloud and type.
const KEY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const KEY_PATTERN = /^SB-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
const DEVICE_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

/** A new license key. 12 characters from a 32-character alphabet gives 60 bits, with no modulo bias. */
export function newLicenseKey(): string {
  let chars = '';
  for (const byte of randomBytes(12)) chars += KEY_ALPHABET[byte % KEY_ALPHABET.length];
  return `SB-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

/** Normalizes user input. Returns null when the value is not a well-formed key. */
export function normalizeLicenseKey(raw: string): string | null {
  const key = raw.replace(/\s+/g, '').toUpperCase();
  return KEY_PATTERN.test(key) ? key : null;
}

/** Only the hash is stored. A database leak does not expose usable keys. */
export function hashLicenseKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function isValidDeviceId(id: string): boolean {
  return DEVICE_PATTERN.test(id);
}

export interface DeviceClaims {
  purchaseId: string;
  deviceId: string;
}

function signingKey(secret: string): Uint8Array {
  if (secret.length < 32) throw new Error('LICENSE_TOKEN_SECRET must be at least 32 characters.');
  return new TextEncoder().encode(secret);
}

export async function signDeviceToken(
  claims: DeviceClaims,
  secret: string,
  ttlDays: number = TOKEN_TTL_DAYS,
): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);
  const token = await new SignJWT({ dev: claims.deviceId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.purchaseId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(signingKey(secret));
  return { token, expiresAt };
}

export async function verifyDeviceToken(token: string, secret: string): Promise<DeviceClaims> {
  const { payload } = await jwtVerify(token, signingKey(secret), { algorithms: ['HS256'] });
  if (typeof payload.sub !== 'string' || typeof payload.dev !== 'string') {
    throw new Error('Malformed device token.');
  }
  return { purchaseId: payload.sub, deviceId: payload.dev };
}
