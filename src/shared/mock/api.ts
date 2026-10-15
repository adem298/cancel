import type {
  ActivityQuery,
  Alert,
  AuditEvent,
  CancelTiming,
  CancellationDetail,
  CancellationOutcome,
  CancellationQuery,
  CancellationRecord,
  DashboardApi,
  DemoControls,
  OfferKind,
  Overview,
  Page,
  RangeKey,
  ReasonId,
  Session,
  Settings,
  StripeReadback,
  Subscription,
  WidgetApi,
  WidgetCancelInput,
  WidgetCancelResult,
  WidgetOfferInput,
  WidgetOfferResult,
  WidgetSession,
} from '../types';
import { ApiError } from '../types';
import { PLANS, getPlan } from '../catalog';
import { accentIssues } from '../color';
import { describeOffers, mrrAfterOffer, offerEffectEnd, offersForReason } from '../offers';
import { formatDate, isValidEmail, utcDay } from '../format';
import { formatDate as formatUnixDate, simulateCancel, verifyCancellation, type SimulatedSubscription } from '../../lib/billing';
import { addEvent, findSubscription, mutate, newId, readState, resetState, buildRecordEvents, type MockState } from './store';

export interface MockOptions {
  /** Artificial latency range in milliseconds. Use [0, 0] in tests. */
  latencyMs?: [number, number];
}

const DEMO_TOKEN_PREFIX = 'demo_';
const DAY_MS = 86_400_000;
const RANGE_DAYS: Record<RangeKey, number> = { '7d': 7, '30d': 30, '90d': 90 };

function latency(opts: MockOptions): Promise<void> {
  const [min, max] = opts.latencyMs ?? [180, 420];
  const ms = min + Math.random() * Math.max(0, max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const toUnix = (iso: string): number => Math.floor(new Date(iso).getTime() / 1000);
const fromUnix = (unix: number): string => new Date(unix * 1000).toISOString();

/** Map the demo subscription onto the shape Stripe returns, so billing rules apply unchanged. */
function toStripeShape(sub: Subscription): SimulatedSubscription {
  return {
    id: sub.id,
    status: sub.status,
    cancel_at_period_end: sub.cancelAtPeriodEnd,
    cancel_at: sub.cancelAt ? toUnix(sub.cancelAt) : null,
    current_period_end: toUnix(sub.currentPeriodEnd),
  };
}

/** The demo only models the statuses the dashboard shows. Stripe's other statuses map to active. */
function toDemoStatus(status: SimulatedSubscription['status']): Subscription['status'] {
  if (status === 'canceled' || status === 'paused') return status;
  return 'active';
}

function writeBack(sub: Subscription, next: SimulatedSubscription): void {
  sub.status = toDemoStatus(next.status);
  sub.cancelAtPeriodEnd = next.cancel_at_period_end;
  sub.cancelAt = next.cancel_at ? fromUnix(next.cancel_at) : null;
}

/** Send the cancellation to "Stripe" (the subscription store). Skipped when the demo failure switch is on. */
function sendCancelToStripe(sub: Subscription, timing: CancelTiming, now: Date, demo: DemoControls): boolean {
  if (demo.simulateStripeFailure) return false;
  writeBack(sub, simulateCancel(toStripeShape(sub), timing, Math.floor(now.getTime() / 1000)));
  return true;
}

function readback(sub: Subscription, now: Date): { ok: boolean; readback: StripeReadback; message: string; state: string } {
  const verification = verifyCancellation(toStripeShape(sub), formatUnixDate);
  return {
    ok: verification.ok,
    state: verification.state,
    message: verification.message,
    readback: {
      status: sub.status,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      cancelAt: sub.cancelAt,
      verifiedAt: now.toISOString(),
    },
  };
}

function outcomeFor(timing: CancelTiming, ok: boolean): CancellationOutcome {
  if (!ok) return 'unconfirmed';
  return timing === 'now' ? 'canceled' : 'scheduled';
}

function requireSession(state: MockState): Session {
  if (!state.session) throw new ApiError(401, 'Sign in to continue.');
  return state.session;
}

function requireRecord(state: MockState, id: string): CancellationRecord {
  const record = state.cancellations.find((r) => r.id === id);
  if (!record) throw new ApiError(404, 'Cancellation not found.');
  return record;
}

function detailFor(state: MockState, record: CancellationRecord): CancellationDetail {
  const alert = record.alertId ? state.alerts.find((a) => a.id === record.alertId) ?? null : null;
  return {
    record,
    subscription: findSubscription(state, record.subscriptionId) ?? null,
    events: state.events
      .filter((e) => e.cancellationId === record.id)
      .sort((a, b) => (a.at < b.at ? -1 : 1)),
    alert,
  };
}

function resolveToken(state: MockState, token: string): Subscription {
  if (!token.startsWith(DEMO_TOKEN_PREFIX)) throw new ApiError(401, 'This link is invalid or has expired.');
  const sub = findSubscription(state, token.slice(DEMO_TOKEN_PREFIX.length));
  if (!sub) throw new ApiError(401, 'This link is invalid or has expired.');
  return sub;
}

function validateSettings(next: Settings): string[] {
  const errors: string[] = [];
  if (!next.brand.displayName.trim()) errors.push('Business name is required.');
  if (!isValidEmail(next.brand.supportEmail)) errors.push('Support email is not valid.');
  if (!isValidEmail(next.alerts.notifyEmail)) errors.push('Alert email is not valid.');
  for (const issue of accentIssues(next.brand.accentColor)) errors.push(`Accent color: ${issue}`);
  const { discount, pause } = next.offers;
  if (!Number.isInteger(discount.percentOff) || discount.percentOff < 5 || discount.percentOff > 50) {
    errors.push('Discount must be between 5% and 50%.');
  }
  if (!Number.isInteger(discount.months) || discount.months < 1 || discount.months > 3) {
    errors.push('Discount length must be 1 to 3 months.');
  }
  if (!Number.isInteger(pause.months) || pause.months < 1 || pause.months > 3) {
    errors.push('Pause length must be 1 to 3 months.');
  }
  if (!PLANS.some((p) => p.id === next.offers.downgrade.targetPlan)) errors.push('Downgrade target plan is not valid.');
  return errors;
}

function summariseSettingsChange(prev: Settings, next: Settings): string {
  const changed: string[] = [];
  if (prev.brand.accentColor !== next.brand.accentColor) changed.push('widget color');
  if (prev.brand.displayName !== next.brand.displayName) changed.push('business name');
  if (JSON.stringify(prev.reasons) !== JSON.stringify(next.reasons)) changed.push('save offers by reason');
  if (JSON.stringify(prev.offers) !== JSON.stringify(next.offers)) changed.push('offer terms');
  if (prev.defaultTiming !== next.defaultTiming) changed.push('default timing');
  if (prev.alerts.notifyEmail !== next.alerts.notifyEmail) changed.push('alert email');
  if (prev.brand.supportEmail !== next.brand.supportEmail) changed.push('support email');
  return changed.length ? `Updated ${changed.join(', ')}.` : 'Settings saved with no changes.';
}

export function createMockDashboardApi(opts: MockOptions = {}): DashboardApi {
  return {
    mode: 'demo',

    async getSession() {
      await latency(opts);
      return readState().session;
    },

    async signIn(email, password) {
      await latency(opts);
      if (!isValidEmail(email) || password.length < 8) {
        throw new ApiError(401, 'Email or password is incorrect.');
      }
      return mutate((state) => {
        const name = email.split('@')[0]!.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        state.session = { name, email, businessName: state.settings.brand.displayName };
        return state.session;
      });
    },

    async signOut() {
      await latency(opts);
      mutate((state) => {
        state.session = null;
      });
    },

    async getOverview(range: RangeKey): Promise<Overview> {
      await latency(opts);
      const state = readState();
      requireSession(state);
      const now = Date.now();
      const days = RANGE_DAYS[range];
      const since = now - days * DAY_MS;
      const inRange = state.cancellations.filter((r) => new Date(r.createdAt).getTime() >= since);

      const byDay = new Map<string, { cancellations: number; saved: number }>();
      for (let d = days - 1; d >= 0; d -= 1) {
        byDay.set(utcDay(new Date(now - d * DAY_MS).toISOString()), { cancellations: 0, saved: 0 });
      }
      for (const r of inRange) {
        const bucket = byDay.get(utcDay(r.createdAt));
        if (!bucket) continue;
        bucket.cancellations += 1;
        if (r.offerAccepted) bucket.saved += 1;
      }

      const saved = inRange.filter((r) => r.offerAccepted).length;
      const verified = inRange.filter((r) => r.outcome !== 'unconfirmed').length;
      const reasonCounts = new Map<ReasonId, number>();
      for (const r of inRange) {
        if (r.reason) reasonCounts.set(r.reason, (reasonCounts.get(r.reason) ?? 0) + 1);
      }
      const withReason = [...reasonCounts.values()].reduce((a, b) => a + b, 0);

      return {
        range,
        totals: {
          cancellations: inRange.length,
          saved,
          saveRate: inRange.length ? saved / inRange.length : 0,
          mrrKeptUsd: inRange.reduce((sum, r) => sum + r.mrrKeptUsd, 0),
          openAlerts: state.alerts.filter((a) => a.status === 'open').length,
          verifiedRate: inRange.length ? verified / inRange.length : 1,
        },
        series: [...byDay.entries()].map(([date, v]) => ({ date, ...v })),
        reasons: [...reasonCounts.entries()]
          .map(([reason, count]) => ({ reason, count, share: withReason ? count / withReason : 0 }))
          .sort((a, b) => b.count - a.count),
        recent: [...inRange].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 6),
      };
    },

    async listCancellations(query: CancellationQuery): Promise<Page<CancellationRecord>> {
      await latency(opts);
      const state = readState();
      requireSession(state);
      const term = query.search?.trim().toLowerCase() ?? '';
      const filtered = state.cancellations
        .filter((r) => (query.outcome && query.outcome !== 'all' ? r.outcome === query.outcome : true))
        .filter((r) => (query.reason && query.reason !== 'all' ? r.reason === query.reason : true))
        .filter((r) => (term ? `${r.id} ${r.subscriptionId} ${r.customerEmail}`.toLowerCase().includes(term) : true))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      const start = (query.page - 1) * query.pageSize;
      return {
        items: filtered.slice(start, start + query.pageSize),
        total: filtered.length,
        page: query.page,
        pageSize: query.pageSize,
      };
    },

    async getCancellation(id: string): Promise<CancellationDetail> {
      await latency(opts);
      const state = readState();
      requireSession(state);
      return detailFor(state, requireRecord(state, id));
    },

    async reverifyCancellation(id: string): Promise<CancellationDetail> {
      await latency(opts);
      return mutate((state, now) => {
        requireSession(state);
        const record = requireRecord(state, id);
        const sub = findSubscription(state, record.subscriptionId);
        if (!sub) throw new ApiError(404, 'Subscription not found.');
        const check = readback(sub, now);
        record.readback = check.readback;
        record.updatedAt = now.toISOString();
        addEvent(state, {
          type: 'reverified',
          at: now.toISOString(),
          actor: 'owner',
          subscriptionId: sub.id,
          cancellationId: record.id,
          summary: `Re-checked in Stripe: ${check.message}`,
        });
        if (record.outcome === 'unconfirmed' && check.ok) {
          record.outcome = outcomeFor(record.timing, true);
          const alert = state.alerts.find((a) => a.id === record.alertId);
          if (alert && alert.status === 'open') {
            alert.status = 'resolved';
            alert.resolvedAt = now.toISOString();
            alert.resolutionNote = 'Stripe now confirms the cancellation.';
            addEvent(state, { type: 'alert_resolved', at: now.toISOString(), actor: 'system', subscriptionId: sub.id, cancellationId: record.id, summary: 'Alert resolved automatically after Stripe confirmed the change.' });
          }
        }
        return detailFor(state, record);
      });
    },

    async retryCancellation(id: string): Promise<CancellationDetail> {
      await latency(opts);
      return mutate((state, now) => {
        requireSession(state);
        const record = requireRecord(state, id);
        if (record.outcome !== 'unconfirmed') throw new ApiError(409, 'Only unconfirmed cancellations can be retried.');
        const sub = findSubscription(state, record.subscriptionId);
        if (!sub) throw new ApiError(404, 'Subscription not found.');

        // Idempotent: the cancellation record id is the idempotency key for the Stripe update.
        const sent = sendCancelToStripe(sub, record.timing, now, state.demo);
        addEvent(state, {
          type: 'stripe_update_sent',
          at: now.toISOString(),
          actor: 'owner',
          subscriptionId: sub.id,
          cancellationId: record.id,
          summary: sent ? 'Retried cancellation in Stripe.' : 'Retry sent to Stripe, but the update did not apply.',
        });
        const check = readback(sub, now);
        record.readback = check.readback;
        record.updatedAt = now.toISOString();
        addEvent(state, { type: 'stripe_readback', at: now.toISOString(), actor: 'system', subscriptionId: sub.id, cancellationId: record.id, summary: check.message });

        if (check.ok) {
          record.outcome = outcomeFor(record.timing, true);
          const alert = state.alerts.find((a) => a.id === record.alertId);
          if (alert && alert.status === 'open') {
            alert.status = 'resolved';
            alert.resolvedAt = now.toISOString();
            alert.resolutionNote = 'Cancellation retried and confirmed by Stripe.';
            addEvent(state, { type: 'alert_resolved', at: now.toISOString(), actor: 'owner', subscriptionId: sub.id, cancellationId: record.id, summary: 'Alert resolved after a confirmed retry.' });
          }
          addEvent(state, { type: 'confirmation_sent', at: now.toISOString(), actor: 'system', subscriptionId: sub.id, cancellationId: record.id, summary: `Confirmation email sent to ${record.customerEmail}.` });
        }
        return detailFor(state, record);
      });
    },

    async listAlerts(status) {
      await latency(opts);
      const state = readState();
      requireSession(state);
      return state.alerts
        .filter((a) => status === 'all' || a.status === status)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },

    async resolveAlert(id: string, note: string): Promise<Alert> {
      await latency(opts);
      return mutate((state, now) => {
        requireSession(state);
        const alert = state.alerts.find((a) => a.id === id);
        if (!alert) throw new ApiError(404, 'Alert not found.');
        if (note.trim().length < 5) throw new ApiError(422, 'Add a short note explaining how this was resolved.');
        if (alert.status === 'resolved') throw new ApiError(409, 'This alert is already resolved.');
        alert.status = 'resolved';
        alert.resolvedAt = now.toISOString();
        alert.resolutionNote = note.trim();
        addEvent(state, { type: 'alert_resolved', at: now.toISOString(), actor: 'owner', subscriptionId: alert.subscriptionId, cancellationId: alert.cancellationId, summary: `Alert resolved: ${note.trim()}` });
        return alert;
      });
    },

    async listActivity(query: ActivityQuery): Promise<Page<AuditEvent>> {
      await latency(opts);
      const state = readState();
      requireSession(state);
      const filtered = state.events
        .filter((e) => (query.type && query.type !== 'all' ? e.type === query.type : true))
        .sort((a, b) => (a.at < b.at ? 1 : -1));
      const start = (query.page - 1) * query.pageSize;
      return { items: filtered.slice(start, start + query.pageSize), total: filtered.length, page: query.page, pageSize: query.pageSize };
    },

    async getSettings() {
      await latency(opts);
      const state = readState();
      requireSession(state);
      return state.settings;
    },

    async updateSettings(next: Settings) {
      await latency(opts);
      return mutate((state, now) => {
        requireSession(state);
        const errors = validateSettings(next);
        if (errors.length > 0) throw new ApiError(422, errors.join(' '));
        const summary = summariseSettingsChange(state.settings, next);
        state.settings = {
          ...next,
          brand: { ...next.brand, displayName: next.brand.displayName.trim() },
          stripe: state.settings.stripe, // read-only in the dashboard
        };
        addEvent(state, { type: 'settings_changed', at: now.toISOString(), actor: 'owner', subscriptionId: null, cancellationId: null, summary });
        return state.settings;
      });
    },

    async getDemoControls() {
      await latency(opts);
      return readState().demo;
    },

    async setDemoControls(next: DemoControls) {
      await latency(opts);
      return mutate((state) => {
        requireSession(state);
        state.demo = { simulateStripeFailure: Boolean(next.simulateStripeFailure) };
        return state.demo;
      });
    },

    async resetDemoData() {
      await latency(opts);
      resetState();
    },
  };
}

export function createMockWidgetApi(opts: MockOptions = {}): WidgetApi {
  return {
    async getSession(token: string): Promise<WidgetSession> {
      await latency(opts);
      const state = readState();
      const sub = resolveToken(state, token);
      const plan = getPlan(sub.planId);
      const offerDetails = describeOffers(state.settings, plan);
      const reasons = (Object.keys(state.settings.reasons) as ReasonId[]).filter((r) => state.settings.reasons[r].enabled);
      const offers = Object.fromEntries(
        (Object.keys(state.settings.reasons) as ReasonId[]).map((r) => [r, offersForReason(state.settings, r, plan)]),
      ) as Record<ReasonId, OfferKind[]>;
      return {
        business: {
          displayName: state.settings.brand.displayName,
          accentColor: state.settings.brand.accentColor,
          supportEmail: state.settings.brand.supportEmail,
        },
        subscription: {
          id: sub.id,
          planName: plan.name,
          priceUsd: sub.priceUsd,
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd,
          customerEmail: sub.customerEmail,
          cancelAt: sub.cancelAt,
        },
        defaultTiming: state.settings.defaultTiming,
        reasons,
        offers,
        offerDetails: Object.fromEntries(
          Object.entries(offerDetails).map(([k, v]) => [k, { label: v.label, detail: v.detail }]),
        ) as WidgetSession['offerDetails'],
      };
    },

    async acceptOffer(token: string, input: WidgetOfferInput): Promise<WidgetOfferResult> {
      await latency(opts);
      return mutate((state, now) => {
        const sub = resolveToken(state, token);
        if (sub.status === 'canceled') throw new ApiError(409, 'This subscription is already cancelled.');
        const plan = getPlan(sub.planId);
        const allowed = offersForReason(state.settings, input.reason, plan);
        if (!allowed.includes(input.kind)) throw new ApiError(422, 'This offer is not available.');

        const nowIso = now.toISOString();
        const effect = mrrAfterOffer(input.kind, state.settings, plan);
        const endsAt = offerEffectEnd(input.kind, state.settings, nowIso);
        const recordId = newId(state, 'can');
        const record: CancellationRecord = {
          id: recordId,
          subscriptionId: sub.id,
          customerEmail: sub.customerEmail,
          planId: sub.planId,
          priceUsd: sub.priceUsd,
          reason: input.reason,
          timing: state.settings.defaultTiming,
          offersShown: input.offersShown,
          offerAccepted: input.kind,
          outcome: 'saved',
          accessEndsAt: sub.currentPeriodEnd,
          readback: null,
          mrrKeptUsd: effect.mrrKeptUsd,
          alertId: null,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        if (input.kind === 'discount') {
          sub.discountPercentOff = state.settings.offers.discount.percentOff;
          sub.discountEndsAt = endsAt;
        } else if (input.kind === 'pause') {
          sub.status = 'paused';
          sub.pauseResumesAt = endsAt;
        } else {
          sub.pendingPlanId = effect.planId;
        }
        record.readback = { status: sub.status, cancelAtPeriodEnd: false, cancelAt: null, verifiedAt: nowIso };
        state.cancellations.push(record);
        buildRecordEvents(state, record);

        const effectiveFrom = input.kind === 'downgrade' ? sub.currentPeriodEnd : nowIso;
        const summary =
          input.kind === 'discount'
            ? `${state.settings.offers.discount.percentOff}% off applied for ${state.settings.offers.discount.months} months.`
            : input.kind === 'pause'
              ? `Billing paused until ${formatDate(endsAt ?? nowIso)}.`
              : `Your plan changes to ${getPlan(effect.planId).name} on ${formatDate(sub.currentPeriodEnd)}.`;
        return { kind: input.kind, effectiveFrom, summary };
      });
    },

    async cancel(token: string, input: WidgetCancelInput): Promise<WidgetCancelResult> {
      await latency(opts);
      return mutate((state, now): WidgetCancelResult => {
        const sub = resolveToken(state, token);
        if (sub.status === 'canceled') throw new ApiError(409, 'This subscription is already cancelled.');
        if (sub.cancelAtPeriodEnd) throw new ApiError(409, 'This subscription is already scheduled to cancel.');
        if (input.timing !== 'now' && input.timing !== 'period_end') throw new ApiError(422, 'Choose when access ends.');
        if (!state.settings.reasons[input.reason]?.enabled) throw new ApiError(422, 'Choose a reason.');

        const nowIso = now.toISOString();
        const recordId = newId(state, 'can');
        const record: CancellationRecord = {
          id: recordId,
          subscriptionId: sub.id,
          customerEmail: sub.customerEmail,
          planId: sub.planId,
          priceUsd: sub.priceUsd,
          reason: input.reason,
          timing: input.timing,
          offersShown: input.offersShown,
          offerAccepted: null,
          outcome: 'unconfirmed',
          accessEndsAt: input.timing === 'now' ? nowIso : sub.currentPeriodEnd,
          readback: null,
          mrrKeptUsd: 0,
          alertId: null,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        addEvent(state, { type: 'cancel_requested', at: nowIso, actor: 'customer', subscriptionId: sub.id, cancellationId: recordId, summary: `Cancellation requested (${input.timing === 'now' ? 'now' : 'at period end'}).` });
        if (input.offersShown.length > 0) {
          addEvent(state, { type: 'offer_shown', at: nowIso, actor: 'customer', subscriptionId: sub.id, cancellationId: recordId, summary: `Save offers shown: ${input.offersShown.join(', ')}.` });
        }

        const sent = sendCancelToStripe(sub, input.timing, now, state.demo);
        addEvent(state, { type: 'stripe_update_sent', at: nowIso, actor: 'system', subscriptionId: sub.id, cancellationId: recordId, summary: input.timing === 'now' ? 'Requested immediate cancellation in Stripe.' : 'Requested cancellation at period end in Stripe.' });

        const check = readback(sub, now);
        record.readback = check.readback;
        record.outcome = outcomeFor(input.timing, check.ok);
        addEvent(state, { type: 'stripe_readback', at: nowIso, actor: 'system', subscriptionId: sub.id, cancellationId: recordId, summary: sent ? check.message : 'Stripe read-back: subscription still active. Not confirmed.' });

        if (check.ok) {
          record.accessEndsAt = input.timing === 'now' ? nowIso : sub.currentPeriodEnd;
          state.cancellations.push(record);
          addEvent(state, { type: 'confirmation_sent', at: nowIso, actor: 'system', subscriptionId: sub.id, cancellationId: recordId, summary: `Confirmation email sent to ${sub.customerEmail}.` });
          return {
            ok: true,
            outcome: record.outcome === 'canceled' ? 'canceled' : 'scheduled',
            accessEndsAt: record.accessEndsAt,
            confirmationSentTo: sub.customerEmail,
            cancellationId: recordId,
          };
        }

        const alertId = newId(state, 'alt');
        const alert: Alert = {
          id: alertId,
          status: 'open',
          subscriptionId: sub.id,
          cancellationId: recordId,
          expectedState: input.timing === 'now' ? 'canceled' : 'canceled or scheduled to cancel',
          actualStatus: sub.status,
          createdAt: nowIso,
          resolvedAt: null,
          resolutionNote: null,
        };
        record.alertId = alertId;
        state.alerts.push(alert);
        state.cancellations.push(record);
        addEvent(state, { type: 'alert_opened', at: nowIso, actor: 'system', subscriptionId: sub.id, cancellationId: recordId, summary: 'Billing check failed. Owner alerted.' });
        return {
          ok: false,
          reason: 'billing_not_confirmed',
          cancellationId: recordId,
          supportEmail: state.settings.brand.supportEmail,
        };
      });
    },
  };
}

