import type { IncomingMessage, ServerResponse } from 'node:http';
import { recordStripeEvent } from '../server/lib/billing';
import { env } from '../server/lib/env';
import { HttpError, handleError, methodNotAllowed, readBody, sendJson } from '../server/lib/http';
import { stripeClient } from '../server/lib/stripe';

// The signature is computed over the exact raw bytes, so the body must not be parsed first.
export const config = { api: { bodyParser: false } };

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const raw = await readBody(req, 1_000_000);
    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string') throw new HttpError(400, 'Missing Stripe signature.');

    let event;
    try {
      event = stripeClient().webhooks.constructEvent(raw, signature, env('STRIPE_WEBHOOK_SECRET'));
    } catch {
      throw new HttpError(400, 'Invalid Stripe signature.');
    }
    const { duplicate } = await recordStripeEvent(event);
    sendJson(res, 200, { received: true, duplicate });
  } catch (err) {
    handleError(res, err);
  }
}
