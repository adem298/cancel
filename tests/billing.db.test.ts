import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import type Stripe from 'stripe';

// Runs only when TEST_DATABASE_URL points at a real Postgres (for example, a Neon branch or a local instance).
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('billing against Postgres', () => {
  let billing: typeof import('../server/lib/billing');
  let dbmod: typeof import('../server/lib/db');
  let purchaseSession = '';
  let otherSession = '';

  const paidSession = (id: string, product: string | undefined): Stripe.Checkout.Session =>
    ({
      id,
      object: 'checkout.session',
      mode: 'payment',
      payment_status: 'paid',
      amount_total: 2900,
      currency: 'usd',
      customer_details: { email: 'buyer@example.test' },
      metadata: product ? { product } : {},
    }) as unknown as Stripe.Checkout.Session;

  const event = (id: string, session: Stripe.Checkout.Session): Stripe.Event =>
    ({ id, type: 'checkout.session.completed', data: { object: session } }) as unknown as Stripe.Event;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    billing = await import('../server/lib/billing');
    dbmod = await import('../server/lib/db');
    const { readFileSync } = await import('node:fs');
    await dbmod.db().query(readFileSync('db/schema.sql', 'utf8'));
    await dbmod.db().query('truncate devices, purchases, stripe_events cascade');
    purchaseSession = `cs_test_${Date.now()}_a`;
    otherSession = `cs_test_${Date.now()}_b`;
  });

  afterAll(async () => {
    await dbmod?.db().end();
  });

  it('records a paid extension purchase once, even when the webhook is replayed', async () => {
    const e = event(`evt_${Date.now()}_1`, paidSession(purchaseSession, 'extension'));
    expect(await billing.recordStripeEvent(e)).toEqual({ duplicate: false });
    expect(await billing.recordStripeEvent(e)).toEqual({ duplicate: true });
    const rows = await dbmod.db().query('select count(*)::int as n from purchases where stripe_session_id = $1', [purchaseSession]);
    expect(rows.rows[0].n).toBe(1);
  });

  it('ignores checkout sessions that are not for the extension', async () => {
    await billing.recordStripeEvent(event(`evt_${Date.now()}_2`, paidSession(otherSession, 'something_else')));
    const rows = await dbmod.db().query('select count(*)::int as n from purchases where stripe_session_id = $1', [otherSession]);
    expect(rows.rows[0].n).toBe(0);
  });

  it('issues a key once and never again for the same purchase', async () => {
    const first = await billing.claimLicense(purchaseSession);
    expect(first.status).toBe('issued');
    if (first.status !== 'issued') return;
    expect(first.key).toMatch(/^SB-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(await billing.claimLicense(purchaseSession)).toEqual({ status: 'claimed' });

    // Only the hash is stored, never the key.
    const row = await dbmod.db().query('select license_key_hash from purchases where stripe_session_id = $1', [purchaseSession]);
    expect(row.rows[0].license_key_hash).not.toContain(first.key.replace(/-/g, ''));
    expect(row.rows[0].license_key_hash).toMatch(/^[0-9a-f]{64}$/);

    // Keep the key for the device tests below.
    (globalThis as { __key?: string }).__key = first.key;
  });

  it('reports pending until the webhook has created the purchase', async () => {
    expect(await billing.claimLicense('cs_test_does_not_exist')).toEqual({ status: 'pending' });
  });

  it('limits a license to two devices and lets a known device re-activate', async () => {
    const key = (globalThis as { __key?: string }).__key!;
    const a = 'device-aaaaaaaaaaaaaaaa';
    const b = 'device-bbbbbbbbbbbbbbbb';
    const c = 'device-cccccccccccccccc';

    const first = await billing.activateDevice(key, a);
    expect(first.devicesUsed).toBe(1);
    expect((await billing.activateDevice(key, b)).devicesUsed).toBe(2);
    await expect(billing.activateDevice(key, c)).rejects.toMatchObject({ status: 403 });
    expect((await billing.activateDevice(key, a)).devicesUsed).toBe(2);

    expect(await billing.licenseStatus(first.purchaseId, a)).toEqual({ active: true, devicesUsed: 2, maxDevices: 2 });
    expect((await billing.licenseStatus(first.purchaseId, c)).active).toBe(false);
  });

  it('rejects unknown keys and revoked licenses', async () => {
    await expect(billing.activateDevice('SB-AAAA-AAAA-AAAA', 'device-zzzzzzzzzzzzzzzz')).rejects.toMatchObject({ status: 401 });

    const key = (globalThis as { __key?: string }).__key!;
    const { purchaseId } = await billing.activateDevice(key, 'device-aaaaaaaaaaaaaaaa');
    await dbmod.db().query('update purchases set revoked_at = now() where id = $1', [purchaseId]);
    await expect(billing.activateDevice(key, 'device-aaaaaaaaaaaaaaaa')).rejects.toMatchObject({ status: 403 });
    expect((await billing.licenseStatus(purchaseId, 'device-aaaaaaaaaaaaaaaa')).active).toBe(false);
  });
});
