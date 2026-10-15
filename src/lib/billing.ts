/**
 * Pure cancellation logic used by the interactive demo.
 *
 * Mirrors the production rules described in the product spec:
 *  - Save offers depend on the reason the customer gives.
 *  - Cancellation happens "now" or "at period end", chosen by the customer.
 *  - After cancelling, the Stripe subscription state is verified. If the
 *    subscription is neither canceled nor scheduled to cancel, the owner is alerted.
 *
 * Nothing here calls Stripe. The demo uses simulated subscription objects that
 * follow the shape of Stripe's Subscription resource.
 */

export type CancelReasonId =
  | 'too_expensive'
  | 'not_using'
  | 'missing_feature'
  | 'switching_tool'
  | 'other';

export type CancelReason = {
  id: CancelReasonId;
  label: string;
  hint: string;
};

export type SaveOffer =
  | { kind: 'discount'; percentOff: number; months: number; label: string; detail: string }
  | { kind: 'pause'; months: number; label: string; detail: string }
  | { kind: 'downgrade'; toPlan: string; toPriceUsd: number; label: string; detail: string };

export type CancelMode = 'period_end' | 'now';

export type SimulatedSubscription = {
  id: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
  cancel_at_period_end: boolean;
  cancel_at: number | null; // unix seconds, as in Stripe
  current_period_end: number; // unix seconds
  pause_resumes_at?: number | null;
};

export type VerificationResult =
  | { ok: true; state: 'canceled'; message: string }
  | { ok: true; state: 'scheduled'; message: string }
  | { ok: false; state: 'still_active'; message: string };

export const REASONS: readonly CancelReason[] = [
  {
    id: 'too_expensive',
    label: 'It costs too much',
    hint: 'Price is the main issue',
  },
  {
    id: 'not_using',
    label: "I'm not using it enough",
    hint: 'Usage has dropped off',
  },
  {
    id: 'missing_feature',
    label: 'It is missing a feature I need',
    hint: 'Something is not supported yet',
  },
  {
    id: 'switching_tool',
    label: 'I am switching to another tool',
    hint: 'Moving to a different product',
  },
  {
    id: 'other',
    label: 'Something else',
    hint: 'Tell us in your own words',
  },
] as const;

/** Save offers are shown only when they fit the reason. Other reasons go straight to cancellation. */
export function offersForReason(reason: CancelReasonId, currentPlanUsd: number): SaveOffer[] {
  switch (reason) {
    case 'too_expensive':
      return [
        {
          kind: 'discount',
          percentOff: 30,
          months: 2,
          label: '30% off for 2 months',
          detail: 'Your next two invoices are discounted. Then your regular price resumes.',
        },
        ...(currentPlanUsd > 29
          ? [
              {
                kind: 'downgrade' as const,
                toPlan: 'Starter',
                toPriceUsd: 29,
                label: 'Switch to Starter at $29/mo',
                detail: 'Keep your account and data on a lower-cost plan.',
              },
            ]
          : []),
      ];
    case 'not_using':
      return [
        {
          kind: 'pause',
          months: 2,
          label: 'Pause billing for 2 months',
          detail: 'No charges while paused. Your access and data stay in place.',
        },
      ];
    case 'missing_feature':
    case 'switching_tool':
    case 'other':
      return [];
  }
}

/** Unix seconds for the moment access ends, given the customer's choice. */
export function accessEndsAt(mode: CancelMode, periodEndUnix: number, nowUnix: number): number {
  return mode === 'now' ? nowUnix : periodEndUnix;
}

/** Simulate the subscription object Stripe would return after the cancel request. */
export function simulateCancel(
  sub: SimulatedSubscription,
  mode: CancelMode,
  nowUnix: number,
): SimulatedSubscription {
  if (mode === 'now') {
    return { ...sub, status: 'canceled', cancel_at_period_end: false, cancel_at: nowUnix };
  }
  return {
    ...sub,
    cancel_at_period_end: true,
    cancel_at: sub.current_period_end,
  };
}

/**
 * Verify a subscription after a cancel request.
 *
 * This is the billing-integrity check. Cancellation counts as confirmed only when
 * Stripe reports the subscription as canceled or scheduled to cancel.
 */
export function verifyCancellation(sub: SimulatedSubscription, formatDate: (unix: number) => string): VerificationResult {
  if (sub.status === 'canceled') {
    return { ok: true, state: 'canceled', message: 'Stripe reports this subscription as canceled.' };
  }
  if (sub.cancel_at_period_end || sub.cancel_at !== null) {
    const when = formatDate(sub.cancel_at ?? sub.current_period_end);
    return {
      ok: true,
      state: 'scheduled',
      message: `Stripe reports this subscription is scheduled to cancel on ${when}.`,
    };
  }
  return {
    ok: false,
    state: 'still_active',
    message: 'Stripe still shows this subscription as active. The owner has been alerted.',
  };
}

/** Format a unix timestamp as a calendar date in UTC, e.g. "Nov 15, 2026". */
export function formatDate(unix: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(unix * 1000));
}

/** Add whole months in UTC, clamping to the last day of the target month. */
export function addMonthsUnix(unix: number, months: number): number {
  const d = new Date(unix * 1000);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return Math.floor(target.getTime() / 1000);
}
