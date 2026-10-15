import type { Plan, PlanId, ReasonId, OfferKind, CancelTiming, Settings } from './types';

/** Plan catalogue. Mirrors the public pricing page. */
export const PLANS: readonly Plan[] = [
  { id: 'starter', name: 'Starter', priceUsd: 29, subscriptionLimit: 500 },
  { id: 'growth', name: 'Growth', priceUsd: 79, subscriptionLimit: 2500 },
  { id: 'scale', name: 'Scale', priceUsd: 199, subscriptionLimit: 10000 },
];

export const REASON_LABELS: Record<ReasonId, string> = {
  too_expensive: 'It costs too much',
  not_using: "I'm not using it enough",
  missing_feature: 'It is missing a feature I need',
  switching_tool: 'I am switching to another tool',
  other: 'Something else',
};

export const OFFER_LABELS: Record<OfferKind, string> = {
  discount: 'Discount',
  pause: 'Pause',
  downgrade: 'Downgrade',
};

export const TIMING_LABELS: Record<CancelTiming, string> = {
  period_end: 'At period end',
  now: 'Cancel now',
};

export function getPlan(id: PlanId): Plan {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
}

export function defaultSettings(now: Date = new Date()): Settings {
  return {
    brand: {
      displayName: 'Acme Analytics',
      accentColor: '#34d399',
      supportEmail: 'support@acme.io',
    },
    defaultTiming: 'period_end',
    reasons: {
      too_expensive: { enabled: true, offers: ['discount', 'downgrade'] },
      not_using: { enabled: true, offers: ['pause'] },
      missing_feature: { enabled: true, offers: [] },
      switching_tool: { enabled: true, offers: [] },
      other: { enabled: true, offers: [] },
    },
    offers: {
      discount: { percentOff: 30, months: 2 },
      pause: { months: 2 },
      downgrade: { targetPlan: 'starter' },
    },
    alerts: { notifyEmail: 'owner@acme.io' },
    stripe: {
      mode: 'test',
      accountId: 'acct_1Q8fK2Demo',
      connectedAt: now.toISOString(),
      scopes: [
        'Subscriptions: read and update',
        'Customers: read',
        'Invoices: read',
        'Coupons: create (save offers)',
      ],
    },
  };
}
