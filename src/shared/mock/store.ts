import type {
  Alert,
  AuditEvent,
  AuditEventType,
  CancellationRecord,
  DemoControls,
  OfferKind,
  PlanId,
  ReasonId,
  Session,
  Settings,
  Subscription,
} from '../types';
import { defaultSettings } from '../catalog';
import { addMonthsIso, maskEmail } from '../format';

/**
 * Demo persistence. The whole demo dataset lives in one versioned JSON document
 * in localStorage, so the dashboard and the embedded widget (same origin in the
 * demo) see the same records. Production replaces this with the real backend.
 */

export const STORE_VERSION = 1;
const STORAGE_KEY = `stopbill.demo.v${STORE_VERSION}`;

export interface MockState {
  version: number;
  session: Session | null;
  settings: Settings;
  demo: DemoControls;
  subscriptions: Subscription[];
  cancellations: CancellationRecord[];
  alerts: Alert[];
  events: AuditEvent[];
  counter: number;
}

interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function createMemoryStorage(): KeyValue {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function resolveStorage(): KeyValue {
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__stopbill_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return localStorage;
    }
  } catch {
    // Storage can be blocked (private mode, sandboxed iframes). Fall back to memory.
  }
  return createMemoryStorage();
}

let storage: KeyValue = resolveStorage();

/** Test hook: replace the storage backend. */
export function __setStorageForTests(next: KeyValue | null): void {
  storage = next ?? resolveStorage();
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  'maya', 'liam', 'sofia', 'noah', 'amira', 'ethan', 'yasmine', 'lucas', 'nour', 'omar',
  'emma', 'adam', 'lina', 'karim', 'zoe', 'hugo', 'leila', 'ravi', 'elif', 'marco',
];
const DOMAINS = ['northwind.co', 'globex.dev', 'initech.app', 'umbrella.io', 'hooli.com', 'stark.dev', 'wayne.app', 'pied-piper.io'];

export function newId(state: MockState, prefix: string): string {
  state.counter += 1;
  return `${prefix}_${state.counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function addEvent(
  state: MockState,
  event: { type: AuditEventType; at: string; actor: AuditEvent['actor']; subscriptionId: string | null; cancellationId: string | null; summary: string },
): void {
  state.events.push({ id: newId(state, 'evt'), ...event });
}

export function findSubscription(state: MockState, id: string): Subscription | undefined {
  return state.subscriptions.find((s) => s.id === id);
}

/** Demo subscription used by the embed page. Token: `demo_${id}`. */
export const FEATURED_SUBSCRIPTION_ID = 'sub_1Q8fK2demo';

function buildSeed(now: Date): MockState {
  const rand = mulberry32(20261015);
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)] as T;
  const weighted = <T,>(entries: readonly [T, number][]): T => {
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let r = rand() * total;
    for (const [value, w] of entries) {
      r -= w;
      if (r <= 0) return value;
    }
    return entries[entries.length - 1]![0];
  };
  const day = 86_400_000;

  const settings = defaultSettings(now);
  const state: MockState = {
    version: STORE_VERSION,
    session: null,
    settings,
    demo: { simulateStripeFailure: false },
    subscriptions: [],
    cancellations: [],
    alerts: [],
    events: [],
    counter: 0,
  };

  // Featured subscription for the embed demo: active, not yet cancelled.
  state.subscriptions.push({
    id: FEATURED_SUBSCRIPTION_ID,
    customerEmail: 'm•••@acme.io',
    planId: 'growth',
    status: 'active',
    priceUsd: 79,
    currentPeriodEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 21)).toISOString(),
    cancelAtPeriodEnd: false,
    cancelAt: null,
    discountPercentOff: null,
    discountEndsAt: null,
    pauseResumesAt: null,
    pendingPlanId: null,
    createdAt: new Date(now.getTime() - 200 * day).toISOString(),
  });

  // Active base: subscriptions that never cancelled.
  for (let i = 0; i < 38; i += 1) {
    const planId: PlanId = weighted<PlanId>([['starter', 40], ['growth', 40], ['scale', 20]]);
    const priceUsd = planId === 'starter' ? 29 : planId === 'growth' ? 79 : 199;
    state.subscriptions.push({
      id: `sub_${(1000 + i * 37).toString(36)}${i}`,
      customerEmail: maskEmail(`${pick(FIRST_NAMES)}${i}@${pick(DOMAINS)}`),
      planId,
      status: 'active',
      priceUsd,
      currentPeriodEnd: new Date(now.getTime() + (3 + Math.floor(rand() * 26)) * day).toISOString(),
      cancelAtPeriodEnd: false,
      cancelAt: null,
      discountPercentOff: null,
      discountEndsAt: null,
      pauseResumesAt: null,
      pendingPlanId: null,
      createdAt: new Date(now.getTime() - (60 + Math.floor(rand() * 500)) * day).toISOString(),
    });
  }

  // Historical cancellation flows across the last 90 days.
  const alertCandidates: number[] = [];
  for (let i = 0; i < 64; i += 1) {
    const createdMs = now.getTime() - Math.floor(Math.pow(rand(), 1.4) * 90 * day) - Math.floor(rand() * 3600_000);
    const createdAt = new Date(createdMs).toISOString();
    const planId: PlanId = weighted<PlanId>([['starter', 35], ['growth', 45], ['scale', 20]]);
    const priceUsd = planId === 'starter' ? 29 : planId === 'growth' ? 79 : 199;
    const reason: ReasonId = weighted<ReasonId>([
      ['too_expensive', 36],
      ['not_using', 26],
      ['missing_feature', 15],
      ['switching_tool', 12],
      ['other', 11],
    ]);
    const timing = rand() < 0.7 ? 'period_end' : 'now';
    const offersShown: OfferKind[] = [];
    if (reason === 'too_expensive') {
      offersShown.push('discount');
      if (planId !== 'starter') offersShown.push('downgrade');
    }
    if (reason === 'not_using') offersShown.push('pause');

    const accepted = offersShown.length > 0 && rand() < 0.45 ? pick(offersShown) : null;
    const unconfirmed = !accepted && rand() < 0.1;
    const outcome: CancellationRecord['outcome'] = accepted
      ? 'saved'
      : unconfirmed
        ? 'unconfirmed'
        : timing === 'now'
          ? 'canceled'
          : 'scheduled';

    const periodDays = timing === 'period_end' ? 1 + Math.floor(rand() * 30) : 0;
    const accessEndsMs = timing === 'now' ? createdMs : createdMs + periodDays * day;
    const accessEndsAt = new Date(accessEndsMs).toISOString();
    const subscriptionId = `sub_h${i.toString(36)}${Math.floor(rand() * 9000 + 1000).toString(36)}`;

    let mrrKeptUsd = 0;
    let status: Subscription['status'] = 'active';
    let discountPercentOff: number | null = null;
    let discountEndsAt: string | null = null;
    let pauseResumesAt: string | null = null;
    let planAfter: PlanId = planId;
    if (accepted === 'discount') {
      discountPercentOff = settings.offers.discount.percentOff;
      discountEndsAt = addMonthsIso(createdAt, settings.offers.discount.months);
      mrrKeptUsd = Math.round(priceUsd * (100 - discountPercentOff)) / 100;
    } else if (accepted === 'pause') {
      status = 'paused';
      pauseResumesAt = addMonthsIso(createdAt, settings.offers.pause.months);
    } else if (accepted === 'downgrade') {
      planAfter = settings.offers.downgrade.targetPlan;
      mrrKeptUsd = planAfter === 'starter' ? 29 : planAfter === 'growth' ? 79 : 199;
    }
    const pendingPlanId = accepted === 'downgrade' ? planAfter : null;
    const cancelledNow = outcome === 'canceled';
    const accessEnded = accessEndsMs <= now.getTime();
    if (cancelledNow || (outcome === 'scheduled' && accessEnded)) status = 'canceled';

    const sub: Subscription = {
      id: subscriptionId,
      customerEmail: maskEmail(`${pick(FIRST_NAMES)}${i}@${pick(DOMAINS)}`),
      planId: accepted === 'downgrade' ? planId : planAfter,
      status,
      priceUsd,
      currentPeriodEnd: timing === 'now' ? addMonthsIso(createdAt, 1) : accessEndsAt,
      cancelAtPeriodEnd: outcome === 'scheduled' && !accessEnded,
      cancelAt: outcome === 'scheduled' || cancelledNow ? accessEndsAt : null,
      discountPercentOff,
      discountEndsAt,
      pauseResumesAt,
      pendingPlanId,
      createdAt: new Date(createdMs - 120 * day).toISOString(),
    };
    state.subscriptions.push(sub);

    const readbackStatus: Subscription['status'] = cancelledNow ? 'canceled' : status;
    const readback = {
      status: readbackStatus,
      cancelAtPeriodEnd: outcome === 'scheduled' && !accessEnded,
      cancelAt: outcome === 'scheduled' || cancelledNow ? accessEndsAt : null,
      verifiedAt: new Date(createdMs + 8_000).toISOString(),
    };

    const record: CancellationRecord = {
      id: `can_h${i.toString(36)}${Math.floor(rand() * 9000 + 1000).toString(36)}`,
      subscriptionId,
      customerEmail: sub.customerEmail,
      planId,
      priceUsd,
      reason,
      timing,
      offersShown,
      offerAccepted: accepted,
      outcome,
      accessEndsAt,
      readback: outcome === 'unconfirmed' ? { ...readback, status: 'active', cancelAtPeriodEnd: false, cancelAt: null } : readback,
      mrrKeptUsd,
      alertId: null,
      createdAt,
      updatedAt: createdAt,
    };
    if (outcome === 'unconfirmed') {
      sub.status = 'active';
      sub.cancelAtPeriodEnd = false;
      sub.cancelAt = null;
      alertCandidates.push(state.cancellations.length);
    }
    state.cancellations.push(record);
  }

  // Alerts for unconfirmed flows. The two most recent stay open; older ones were resolved.
  const sorted = [...alertCandidates].sort((a, b) => (state.cancellations[b]!.createdAt > state.cancellations[a]!.createdAt ? 1 : -1));
  sorted.forEach((index, rank) => {
    const record = state.cancellations[index]!;
    const open = rank < 2;
    const alert: Alert = {
      id: `alt_${index.toString(36)}${rank}`,
      status: open ? 'open' : 'resolved',
      subscriptionId: record.subscriptionId,
      cancellationId: record.id,
      expectedState: record.timing === 'now' ? 'canceled' : 'canceled or scheduled to cancel',
      actualStatus: 'active',
      createdAt: new Date(new Date(record.createdAt).getTime() + 9_000).toISOString(),
      resolvedAt: open ? null : new Date(new Date(record.createdAt).getTime() + 3 * day).toISOString(),
      resolutionNote: open ? null : 'Confirmed with the customer. Cancelled manually in Stripe, then re-checked.',
    };
    state.alerts.push(alert);
    record.alertId = alert.id;
  });

  // Build the audit trail for every seeded record.
  for (const record of state.cancellations) {
    buildRecordEvents(state, record);
  }

  return state;
}

/** Audit events for a record, in the order they happened. */
export function buildRecordEvents(state: MockState, record: CancellationRecord): void {
  const t0 = new Date(record.createdAt).getTime();
  const at = (s: number) => new Date(t0 + s * 1000).toISOString();
  const base = { subscriptionId: record.subscriptionId, cancellationId: record.id };
  const reasonLabel = record.reason ?? 'none';

  addEvent(state, { ...base, type: 'cancel_requested', at: at(0), actor: 'customer', summary: `Cancellation flow started. Reason: ${reasonLabel.replace(/_/g, ' ')}.` });
  if (record.offersShown.length > 0) {
    addEvent(state, { ...base, type: 'offer_shown', at: at(4), actor: 'customer', summary: `Save offers shown: ${record.offersShown.join(', ')}.` });
  }
  if (record.offerAccepted) {
    addEvent(state, { ...base, type: 'offer_accepted', at: at(20), actor: 'customer', summary: `Accepted ${record.offerAccepted} offer. Subscription kept.` });
  } else {
    addEvent(state, { ...base, type: 'stripe_update_sent', at: at(20), actor: 'system', summary: record.timing === 'now' ? 'Requested immediate cancellation in Stripe.' : 'Requested cancellation at period end in Stripe.' });
  }
  const readbackSummary =
    record.outcome === 'unconfirmed'
      ? 'Stripe read-back: subscription still active. Not confirmed.'
      : record.outcome === 'saved'
        ? 'Stripe read-back: subscription active after offer.'
        : record.outcome === 'canceled'
          ? 'Stripe read-back: status canceled.'
          : 'Stripe read-back: scheduled to cancel.';
  if (record.offerAccepted === null) {
    addEvent(state, { ...base, type: 'stripe_readback', at: at(28), actor: 'system', summary: readbackSummary });
  }
  if (record.outcome === 'scheduled' || record.outcome === 'canceled') {
    addEvent(state, { ...base, type: 'confirmation_sent', at: at(31), actor: 'system', summary: `Confirmation email sent to ${record.customerEmail}.` });
  }
  if (record.outcome === 'unconfirmed') {
    addEvent(state, { ...base, type: 'alert_opened', at: at(31), actor: 'system', summary: 'Billing check failed. Owner alerted.' });
    const alert = state.alerts.find((a) => a.cancellationId === record.id);
    if (alert?.status === 'resolved') {
      addEvent(state, { ...base, type: 'alert_resolved', at: alert.resolvedAt ?? at(3600), actor: 'owner', summary: 'Alert resolved by owner.' });
    }
  }
}

function persist(state: MockState): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function parse(raw: string | null): MockState | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as MockState;
    return data.version === STORE_VERSION ? data : null;
  } catch {
    return null;
  }
}

/** Read the current state. Creates and stores the seed on first use. */
export function readState(now: Date = new Date()): MockState {
  const existing = parse(storage.getItem(STORAGE_KEY));
  if (existing) return existing;
  const seeded = buildSeed(now);
  persist(seeded);
  return seeded;
}

/** Load, mutate, and save in one step. */
export function mutate<T>(fn: (state: MockState, now: Date) => T, now: Date = new Date()): T {
  const state = readState(now);
  const result = fn(state, now);
  persist(state);
  return result;
}

export function resetState(now: Date = new Date()): void {
  const previous = parse(storage.getItem(STORAGE_KEY));
  const next = buildSeed(now);
  next.session = previous?.session ?? null;
  persist(next);
}
