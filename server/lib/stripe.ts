import Stripe from 'stripe';
import { env } from './env';

let client: Stripe | undefined;

/** Stripe client using a restricted key (never a full secret key with broad access). */
export function stripeClient(): Stripe {
  if (!client) client = new Stripe(env('STRIPE_SECRET_KEY'));
  return client;
}
