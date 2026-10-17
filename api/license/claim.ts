import type { IncomingMessage, ServerResponse } from 'node:http';
import { claimLicense } from '../../server/lib/billing';
import { HttpError, handleError, methodNotAllowed, queryParam, sendJson } from '../../server/lib/http';
import { stripeClient } from '../../server/lib/stripe';

/** Exchanges a paid Checkout session for a license key. Returns the key exactly once. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const sessionId = queryParam(req, 'session_id');
    if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw new HttpError(400, 'Missing or invalid session.');

    // Confirm payment with Stripe directly. Do not trust the redirect alone.
    const session = await stripeClient().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.product !== 'extension' || session.payment_status !== 'paid') {
      throw new HttpError(402, 'Payment is not complete for this session.');
    }

    const result = await claimLicense(sessionId);
    if (result.status === 'pending') return sendJson(res, 202, { status: 'pending' });
    if (result.status === 'claimed') {
      throw new HttpError(409, 'The license for this purchase was already shown. Contact support if you lost it.');
    }
    sendJson(res, 200, { licenseKey: result.key });
  } catch (err) {
    handleError(res, err);
  }
}
