import { describe, expect, it } from 'vitest';
import {
  hashLicenseKey,
  isValidDeviceId,
  newLicenseKey,
  normalizeLicenseKey,
  signDeviceToken,
  verifyDeviceToken,
} from '../server/lib/license';

const SECRET = 'x'.repeat(40);
const DEVICE = 'd'.repeat(20);

describe('license keys', () => {
  it('generates keys in the documented format', () => {
    for (let i = 0; i < 50; i++) {
      const key = newLicenseKey();
      expect(key).toMatch(/^SB-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(normalizeLicenseKey(key)).toBe(key);
    }
  });

  it('accepts lowercase input with stray spaces', () => {
    const key = newLicenseKey();
    expect(normalizeLicenseKey(`  ${key.toLowerCase().replace(/-/g, ' - ')} `)).toBe(key);
  });

  it('rejects characters that are easy to confuse', () => {
    expect(normalizeLicenseKey('SB-0000-1111-IOLA')).toBeNull();
    expect(normalizeLicenseKey('SB-ABCD-EFGH')).toBeNull();
    expect(normalizeLicenseKey('XX-ABCD-EFGH-JKMN')).toBeNull();
  });

  it('hashes deterministically and never returns the key itself', () => {
    const hash = hashLicenseKey('SB-ABCD-EFGH-JKMN');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashLicenseKey('SB-ABCD-EFGH-JKMN'));
    expect(hash).not.toContain('ABCD');
  });

  it('validates device identifiers', () => {
    expect(isValidDeviceId(DEVICE)).toBe(true);
    expect(isValidDeviceId('short')).toBe(false);
    expect(isValidDeviceId('has spaces in it here')).toBe(false);
  });
});

describe('device tokens', () => {
  it('round-trips the purchase and device claims', async () => {
    const { token } = await signDeviceToken({ purchaseId: 'p-1', deviceId: DEVICE }, SECRET);
    await expect(verifyDeviceToken(token, SECRET)).resolves.toEqual({ purchaseId: 'p-1', deviceId: DEVICE });
  });

  it('rejects a token signed with a different secret', async () => {
    const { token } = await signDeviceToken({ purchaseId: 'p-1', deviceId: DEVICE }, SECRET);
    await expect(verifyDeviceToken(token, 'y'.repeat(40))).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const { token } = await signDeviceToken({ purchaseId: 'p-1', deviceId: DEVICE }, SECRET, -1);
    await expect(verifyDeviceToken(token, SECRET)).rejects.toThrow();
  });

  it('rejects tampered tokens', async () => {
    const { token } = await signDeviceToken({ purchaseId: 'p-1', deviceId: DEVICE }, SECRET);
    const [header, payload, signature] = token.split('.');
    const forged = `${header}.${payload}x.${signature}`;
    await expect(verifyDeviceToken(forged, SECRET)).rejects.toThrow();
  });

  it('refuses to sign with a short secret', async () => {
    await expect(signDeviceToken({ purchaseId: 'p-1', deviceId: DEVICE }, 'short')).rejects.toThrow(/at least 32/);
  });
});
