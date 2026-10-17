import type Stripe from 'stripe';
import type { PoolClient } from 'pg';
import { db } from './db';
import { HttpError } from './http';
import { MAX_DEVICES, hashLicenseKey, newLicenseKey } from './license';

async function rollback(client: PoolClient): Promise<void> {
  await client.query('rollback').catch(() => undefined);
}

/**
 * Stores a Stripe event and applies its effect in one transaction.
 * A replayed event finds its id already stored and changes nothing, so retries are safe.
 */
export async function recordStripeEvent(event: Stripe.Event): Promise<{ duplicate: boolean }> {
  const client = await db().connect();
  try {
    await client.query('begin');
    const inserted = await client.query(
      'insert into stripe_events (id, type) values ($1, $2) on conflict (id) do nothing',
      [event.id, event.type],
    );
    if (inserted.rowCount === 0) {
      await client.query('commit');
      return { duplicate: true };
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'payment' && session.payment_status === 'paid' && session.metadata?.product === 'extension') {
        await client.query(
          `insert into purchases (stripe_session_id, customer_email, amount_total, currency)
           values ($1, $2, $3, $4)
           on conflict (stripe_session_id) do nothing`,
          [session.id, session.customer_details?.email ?? null, session.amount_total ?? null, session.currency ?? null],
        );
      }
    }
    await client.query('commit');
    return { duplicate: false };
  } catch (err) {
    await rollback(client);
    throw err;
  } finally {
    client.release();
  }
}

export type ClaimResult = { status: 'issued'; key: string } | { status: 'pending' } | { status: 'claimed' };

/**
 * Issues the license key for a paid session, once. The key is shown a single time.
 * Only its hash is stored, so a lost key cannot be recovered and needs support to reset.
 */
export async function claimLicense(sessionId: string): Promise<ClaimResult> {
  const client = await db().connect();
  try {
    await client.query('begin');
    const found = await client.query<{ id: string; claimed_at: Date | null }>(
      'select id, claimed_at from purchases where stripe_session_id = $1 for update',
      [sessionId],
    );
    const row = found.rows[0];
    if (!row) {
      // The webhook has not arrived yet. The client should retry shortly.
      await client.query('rollback');
      return { status: 'pending' };
    }
    if (row.claimed_at) {
      await client.query('rollback');
      return { status: 'claimed' };
    }
    const key = newLicenseKey();
    await client.query('update purchases set license_key_hash = $2, claimed_at = now() where id = $1', [
      row.id,
      hashLicenseKey(key),
    ]);
    await client.query('commit');
    return { status: 'issued', key };
  } catch (err) {
    await rollback(client);
    throw err;
  } finally {
    client.release();
  }
}

export async function activateDevice(key: string, deviceId: string): Promise<{ purchaseId: string; devicesUsed: number }> {
  const client = await db().connect();
  try {
    await client.query('begin');
    const found = await client.query<{ id: string; revoked_at: Date | null }>(
      'select id, revoked_at from purchases where license_key_hash = $1 for update',
      [hashLicenseKey(key)],
    );
    const purchase = found.rows[0];
    if (!purchase) throw new HttpError(401, 'That license key is not valid.');
    if (purchase.revoked_at) throw new HttpError(403, 'This license has been revoked. Contact support.');

    const known = await client.query('select 1 from devices where purchase_id = $1 and device_id = $2', [
      purchase.id,
      deviceId,
    ]);
    if (known.rowCount) {
      await client.query('update devices set last_seen_at = now() where purchase_id = $1 and device_id = $2', [
        purchase.id,
        deviceId,
      ]);
    } else {
      const count = await client.query<{ n: string }>('select count(*)::text as n from devices where purchase_id = $1', [
        purchase.id,
      ]);
      if (Number(count.rows[0]?.n ?? 0) >= MAX_DEVICES) {
        throw new HttpError(403, `This license is already active on ${MAX_DEVICES} devices. Contact support to free one.`);
      }
      await client.query('insert into devices (purchase_id, device_id) values ($1, $2)', [purchase.id, deviceId]);
    }
    const total = await client.query<{ n: string }>('select count(*)::text as n from devices where purchase_id = $1', [
      purchase.id,
    ]);
    await client.query('commit');
    return { purchaseId: purchase.id, devicesUsed: Number(total.rows[0]?.n ?? 0) };
  } catch (err) {
    await rollback(client);
    throw err;
  } finally {
    client.release();
  }
}

/** Confirms a device token still matches an active, unrevoked license and registered device. */
export async function licenseStatus(
  purchaseId: string,
  deviceId: string,
): Promise<{ active: boolean; devicesUsed: number; maxDevices: number }> {
  const result = await db().query<{ revoked_at: Date | null; device_ok: boolean; devices: string }>(
    `select p.revoked_at,
            exists (select 1 from devices d where d.purchase_id = p.id and d.device_id = $2) as device_ok,
            (select count(*)::text from devices d2 where d2.purchase_id = p.id) as devices
       from purchases p
      where p.id = $1`,
    [purchaseId, deviceId],
  );
  const row = result.rows[0];
  const active = Boolean(row && !row.revoked_at && row.device_ok);
  return { active, devicesUsed: Number(row?.devices ?? 0), maxDevices: MAX_DEVICES };
}
