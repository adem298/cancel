import { describe, expect, it } from 'vitest';
import {
  addMonthsUnix,
  accessEndsAt,
  formatDate,
  offersForReason,
  simulateCancel,
  verifyCancellation,
  type SimulatedSubscription,
} from '../src/lib/billing';

// 2026-11-15T00:00:00Z
const PERIOD_END = Date.UTC(2026, 10, 15) / 1000;
// 2026-10-15T09:30:00Z
const NOW = Date.UTC(2026, 9, 15, 9, 30) / 1000;

const activeSub: SimulatedSubscription = {
  id: 'sub_demo_123',
  status: 'active',
  cancel_at_period_end: false,
  cancel_at: null,
  current_period_end: PERIOD_END,
};

describe('formatDate', () => {
  it('formats unix seconds as a UTC calendar date', () => {
    expect(formatDate(PERIOD_END)).toBe('Nov 15, 2026');
  });
});

describe('addMonthsUnix', () => {
  it('adds whole months', () => {
    expect(formatDate(addMonthsUnix(NOW, 2))).toBe('Dec 15, 2026');
  });

  it('clamps to the end of shorter months', () => {
    const jan31 = Date.UTC(2026, 0, 31) / 1000;
    expect(formatDate(addMonthsUnix(jan31, 1))).toBe('Feb 28, 2026');
  });

  it('rolls over the year boundary', () => {
    expect(formatDate(addMonthsUnix(NOW, 3))).toBe('Jan 15, 2027');
  });
});

describe('offersForReason', () => {
  it('offers a discount and a downgrade for price objections on a paid plan above Starter', () => {
    const offers = offersForReason('too_expensive', 79);
    expect(offers.map((o) => o.kind)).toEqual(['discount', 'downgrade']);
  });

  it('does not offer a downgrade when the customer is already on Starter', () => {
    const offers = offersForReason('too_expensive', 29);
    expect(offers.map((o) => o.kind)).toEqual(['discount']);
  });

  it('offers a pause for low usage', () => {
    const offers = offersForReason('not_using', 79);
    expect(offers).toHaveLength(1);
    expect(offers[0]?.kind).toBe('pause');
  });

  it('shows no save offer for reasons where an offer would not help', () => {
    expect(offersForReason('missing_feature', 79)).toEqual([]);
    expect(offersForReason('switching_tool', 79)).toEqual([]);
    expect(offersForReason('other', 79)).toEqual([]);
  });
});

describe('accessEndsAt', () => {
  it('ends access immediately when cancelling now', () => {
    expect(accessEndsAt('now', PERIOD_END, NOW)).toBe(NOW);
  });

  it('keeps access until the period end when cancelling at period end', () => {
    expect(accessEndsAt('period_end', PERIOD_END, NOW)).toBe(PERIOD_END);
  });
});

describe('verifyCancellation (billing integrity check)', () => {
  it('confirms an immediate cancellation when Stripe reports canceled', () => {
    const after = simulateCancel(activeSub, 'now', NOW);
    const result = verifyCancellation(after, formatDate);
    expect(result).toMatchObject({ ok: true, state: 'canceled' });
  });

  it('confirms a scheduled cancellation with the exact end date', () => {
    const after = simulateCancel(activeSub, 'period_end', NOW);
    const result = verifyCancellation(after, formatDate);
    expect(result.ok).toBe(true);
    expect(result.state).toBe('scheduled');
    expect(result.message).toContain('Nov 15, 2026');
  });

  it('flags a subscription that is still active and not scheduled to cancel', () => {
    // This is the bug the product exists to catch: local state says cancelled,
    // but the Stripe subscription was never changed.
    const result = verifyCancellation(activeSub, formatDate);
    expect(result).toMatchObject({ ok: false, state: 'still_active' });
  });
});
