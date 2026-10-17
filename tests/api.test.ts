import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeAll, describe, expect, it } from 'vitest';
import checkout from '../api/checkout';
import webhook from '../api/stripe-webhook';
import activate from '../api/license/activate';
import status from '../api/license/status';

// These tests cover the request paths that run before any database or Stripe call:
// method checks, input validation, and webhook signature rejection.

interface Result {
  status: number;
  body: unknown;
}

async function call(
  handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>,
  opts: { method: string; url?: string; headers?: Record<string, string>; body?: string },
): Promise<Result> {
  const req = Object.assign(Readable.from(opts.body ? [Buffer.from(opts.body)] : []), {
    method: opts.method,
    url: opts.url ?? '/',
    headers: opts.headers ?? {},
  }) as unknown as IncomingMessage;

  let statusCode = 200;
  let text = '';
  const res = {
    statusCode: 200,
    setHeader() {},
    end(chunk?: string) {
      statusCode = res.statusCode;
      text = chunk ?? '';
    },
  } as unknown as ServerResponse;

  await handler(req, res);
  return { status: statusCode, body: text ? JSON.parse(text) : undefined };
}

beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder_for_unit_tests';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder_for_unit_tests';
  process.env.EXTENSION_PRICE_ID = 'price_test';
  process.env.APP_URL = 'https://example.test';
  process.env.LICENSE_TOKEN_SECRET = 'z'.repeat(40);
});

describe('method handling', () => {
  it('rejects the wrong HTTP method with 405', async () => {
    expect((await call(checkout, { method: 'GET' })).status).toBe(405);
    expect((await call(webhook, { method: 'GET' })).status).toBe(405);
    expect((await call(activate, { method: 'GET' })).status).toBe(405);
    expect((await call(status, { method: 'POST' })).status).toBe(405);
  });
});

describe('stripe webhook', () => {
  it('rejects a request without a signature', async () => {
    const r = await call(webhook, { method: 'POST', body: '{}' });
    expect(r.status).toBe(400);
  });

  it('rejects an invalid signature before touching the database', async () => {
    const r = await call(webhook, {
      method: 'POST',
      body: '{"id":"evt_1","type":"checkout.session.completed"}',
      headers: { 'stripe-signature': 't=1700000000,v1=deadbeef' },
    });
    expect(r.status).toBe(400);
    expect(r.body).toEqual({ error: 'Invalid Stripe signature.' });
  });
});

describe('license activation input', () => {
  it('rejects a malformed license key', async () => {
    const r = await call(activate, {
      method: 'POST',
      body: JSON.stringify({ licenseKey: 'not-a-key', deviceId: 'd'.repeat(20) }),
      headers: { 'content-type': 'application/json' },
    });
    expect(r.status).toBe(400);
  });

  it('rejects a missing device id', async () => {
    const r = await call(activate, {
      method: 'POST',
      body: JSON.stringify({ licenseKey: 'SB-ABCD-EFGH-JKMN' }),
    });
    expect(r.status).toBe(400);
  });

  it('rejects a non-JSON body', async () => {
    const r = await call(activate, { method: 'POST', body: '{not json' });
    expect(r.status).toBe(400);
  });
});

describe('license status', () => {
  it('requires a bearer token', async () => {
    const r = await call(status, { method: 'GET' });
    expect(r.status).toBe(401);
  });

  it('rejects a forged token', async () => {
    const r = await call(status, { method: 'GET', headers: { authorization: 'Bearer abc.def.ghi' } });
    expect(r.status).toBe(401);
  });
});
