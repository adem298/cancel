import { beforeEach, describe, expect, it } from 'vitest';
import { createMockDashboardApi, createMockWidgetApi } from '../src/shared/mock/api';
import { __setStorageForTests, FEATURED_SUBSCRIPTION_ID, readState } from '../src/shared/mock/store';
import { ApiError } from '../src/shared/types';
import type { Settings } from '../src/shared/types';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

const TOKEN = `demo_${FEATURED_SUBSCRIPTION_ID}`;
const instant = { latencyMs: [0, 0] as [number, number] };

async function expectApiError(promise: Promise<unknown>, status: number): Promise<void> {
  await expect(promise).rejects.toMatchObject({ status });
  await expect(promise).rejects.toBeInstanceOf(ApiError);
}

describe('mock dashboard API', () => {
  let dash: ReturnType<typeof createMockDashboardApi>;

  beforeEach(async () => {
    __setStorageForTests(memoryStorage());
    dash = createMockDashboardApi(instant);
  });

  it('requires a session before reading owner data', async () => {
    expect(await dash.getSession()).toBeNull();
    await expectApiError(dash.getOverview('30d'), 401);
    await expectApiError(dash.listCancellations({ page: 1, pageSize: 10 }), 401);
  });

  it('rejects bad credentials and accepts a demo sign-in', async () => {
    await expectApiError(dash.signIn('not-an-email', 'longenough'), 401);
    await expectApiError(dash.signIn('owner@acme.io', 'short'), 401);
    const session = await dash.signIn('owner@acme.io', 'correct horse battery');
    expect(session.email).toBe('owner@acme.io');
    expect(session.name).toBe('Owner');
    await dash.signOut();
    expect(await dash.getSession()).toBeNull();
  });

  it('builds an overview whose totals agree with the records', async () => {
    await dash.signIn('owner@acme.io', 'correct horse battery');
    const overview = await dash.getOverview('90d');
    expect(overview.series).toHaveLength(90);
    expect(overview.totals.cancellations).toBeGreaterThan(0);
    expect(overview.totals.saveRate).toBeGreaterThanOrEqual(0);
    expect(overview.totals.saveRate).toBeLessThanOrEqual(1);
    const seriesTotal = overview.series.reduce((sum, p) => sum + p.cancellations, 0);
    expect(seriesTotal).toBe(overview.totals.cancellations);
    const seriesSaved = overview.series.reduce((sum, p) => sum + p.saved, 0);
    expect(seriesSaved).toBe(overview.totals.saved);
  });

  it('filters and paginates cancellations', async () => {
    await dash.signIn('owner@acme.io', 'correct horse battery');
    const all = await dash.listCancellations({ page: 1, pageSize: 10 });
    expect(all.items).toHaveLength(10);
    const unconfirmed = await dash.listCancellations({ page: 1, pageSize: 100, outcome: 'unconfirmed' });
    expect(unconfirmed.items.every((r) => r.outcome === 'unconfirmed')).toBe(true);
    const search = await dash.listCancellations({ page: 1, pageSize: 100, search: all.items[0]!.id });
    expect(search.items.map((r) => r.id)).toContain(all.items[0]!.id);
  });

  it('rejects settings that would make the widget unreadable', async () => {
    await dash.signIn('owner@acme.io', 'correct horse battery');
    const settings = await dash.getSettings();
    await expectApiError(dash.updateSettings({ ...settings, brand: { ...settings.brand, accentColor: '#0a0a0b' } }), 422);
    await expectApiError(dash.updateSettings({ ...settings, offers: { ...settings.offers, discount: { percentOff: 80, months: 2 } } }), 422);
  });

  it('keeps Stripe connection fields read-only when settings are saved', async () => {
    await dash.signIn('owner@acme.io', 'correct horse battery');
    const settings = await dash.getSettings();
    const tampered: Settings = { ...settings, stripe: { ...settings.stripe, accountId: 'acct_hacked', mode: 'live' } };
    const saved = await dash.updateSettings({ ...tampered, brand: { ...tampered.brand, accentColor: '#60a5fa' } });
    expect(saved.stripe.accountId).toBe(settings.stripe.accountId);
    expect(saved.stripe.mode).toBe('test');
    expect(saved.brand.accentColor).toBe('#60a5fa');
  });

  it('requires a real note to resolve an alert, and does not resolve twice', async () => {
    await dash.signIn('owner@acme.io', 'correct horse battery');
    const open = (await dash.listAlerts('open'))[0];
    expect(open).toBeDefined();
    await expectApiError(dash.resolveAlert(open!.id, 'ok'), 422);
    await dash.resolveAlert(open!.id, 'Cancelled manually in Stripe.');
    await expectApiError(dash.resolveAlert(open!.id, 'Cancelled manually in Stripe.'), 409);
  });
});

describe('widget flow against the mock backend', () => {
  let dash: ReturnType<typeof createMockDashboardApi>;
  let widget: ReturnType<typeof createMockWidgetApi>;

  beforeEach(async () => {
    __setStorageForTests(memoryStorage());
    dash = createMockDashboardApi(instant);
    widget = createMockWidgetApi(instant);
    await dash.signIn('owner@acme.io', 'correct horse battery');
  });

  it('rejects unknown or malformed tokens', async () => {
    await expectApiError(widget.getSession('nope'), 401);
    await expectApiError(widget.getSession('demo_sub_missing'), 401);
  });

  it('returns a customer-safe session with offers that match the owner’s settings', async () => {
    const session = await widget.getSession(TOKEN);
    expect(session.subscription.planName).toBe('Growth');
    expect(session.subscription.customerEmail).not.toContain('maya');
    expect(session.offers.too_expensive).toEqual(['discount', 'downgrade']);
    expect(session.offers.missing_feature).toEqual([]);
    expect(session.offerDetails.discount?.label).toBe('30% off for 2 months');
  });

  it('confirms a scheduled cancellation only after Stripe reports it', async () => {
    const result = await widget.cancel(TOKEN, { reason: 'switching_tool', timing: 'period_end', offersShown: [] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome).toBe('scheduled');
    const state = readState();
    const sub = state.subscriptions.find((s) => s.id === FEATURED_SUBSCRIPTION_ID)!;
    expect(sub.cancelAtPeriodEnd).toBe(true);
    expect(sub.status).toBe('active');
    const record = state.cancellations.find((r) => r.id === result.cancellationId)!;
    expect(record.outcome).toBe('scheduled');
    expect(state.events.some((e) => e.cancellationId === record.id && e.type === 'confirmation_sent')).toBe(true);
    await expectApiError(widget.cancel(TOKEN, { reason: 'other', timing: 'now', offersShown: [] }), 409);
    expect((await widget.getSession(TOKEN)).subscription.cancelAt).not.toBeNull();
  });

  it('never tells the customer they are cancelled when Stripe did not apply the change', async () => {
    await dash.setDemoControls({ simulateStripeFailure: true });
    const result = await widget.cancel(TOKEN, { reason: 'other', timing: 'now', offersShown: [] });
    expect(result.ok).toBe(false);
    const state = readState();
    const record = state.cancellations.find((r) => r.id === result.cancellationId)!;
    expect(record.outcome).toBe('unconfirmed');
    const alert = state.alerts.find((a) => a.id === record.alertId)!;
    expect(alert.status).toBe('open');
    expect(state.events.some((e) => e.cancellationId === record.id && e.type === 'confirmation_sent')).toBe(false);
  });

  it('resolves the alert when a retry is confirmed by Stripe', async () => {
    await dash.setDemoControls({ simulateStripeFailure: true });
    const failed = await widget.cancel(TOKEN, { reason: 'other', timing: 'period_end', offersShown: [] });
    if (failed.ok) throw new Error('expected failure');
    await dash.setDemoControls({ simulateStripeFailure: false });
    const detail = await dash.retryCancellation(failed.cancellationId);
    expect(detail.record.outcome).toBe('scheduled');
    expect(detail.alert?.status).toBe('resolved');
    await expectApiError(dash.retryCancellation(failed.cancellationId).then(() => dash.retryCancellation(failed.cancellationId)), 409);
  });

  it('saves the customer with an accepted offer and keeps the subscription active', async () => {
    const result = await widget.acceptOffer(TOKEN, { reason: 'too_expensive', kind: 'discount', offersShown: ['discount', 'downgrade'] });
    expect(result.summary).toContain('30% off');
    const sub = readState().subscriptions.find((s) => s.id === FEATURED_SUBSCRIPTION_ID)!;
    expect(sub.discountPercentOff).toBe(30);
    expect(sub.status).toBe('active');
    await expectApiError(widget.acceptOffer(TOKEN, { reason: 'missing_feature', kind: 'discount', offersShown: [] }), 422);
  });

  it('schedules a downgrade for the next period instead of applying it immediately', async () => {
    const before = readState().subscriptions.find((s) => s.id === FEATURED_SUBSCRIPTION_ID)!;
    const result = await widget.acceptOffer(TOKEN, { reason: 'too_expensive', kind: 'downgrade', offersShown: ['downgrade'] });
    expect(result.effectiveFrom).toBe(before.currentPeriodEnd);
    const after = readState().subscriptions.find((s) => s.id === FEATURED_SUBSCRIPTION_ID)!;
    expect(after.planId).toBe('growth');
    expect(after.pendingPlanId).toBe('starter');
  });

  it('keeps the audit trail in order for each cancellation', async () => {
    const result = await widget.cancel(TOKEN, { reason: 'not_using', timing: 'now', offersShown: ['pause'] });
    const detail = await dash.getCancellation(result.cancellationId);
    const types = detail.events.map((e) => e.type);
    expect(types.indexOf('cancel_requested')).toBeLessThan(types.indexOf('offer_shown'));
    expect(types.indexOf('stripe_update_sent')).toBeLessThan(types.indexOf('stripe_readback'));
    expect(types.indexOf('stripe_readback')).toBeLessThan(types.indexOf('confirmation_sent'));
  });
});
