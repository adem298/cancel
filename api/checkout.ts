import type { IncomingMessage, ServerResponse } from 'node:http';
import { env } from '../server/lib/env';
import { HttpError, handleError, methodNotAllowed, sendJson } from '../server/lib/http';
import { stripeClient } from '../server/lib/stripe';

/** Creates a Stripe Checkout session for the one-time extension price. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const appUrl = env('APP_URL').replace(/\/+$/, '');
    const session = await stripeClient().checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: env('EXTENSION_PRICE_ID'), quantity: 1 }],
      success_url: `${appUrl}/extension/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/extension`,
      metadata: { product: 'extension' },
      payment_intent_data: { metadata: { product: 'extension' } },
    });
    if (!session.url) throw new HttpError(502, 'Checkout is unavailable right now. Please try again.');
    sendJson(res, 200, { url: session.url });
  } catch (err) {
    handleError(res, err);
  }
}
