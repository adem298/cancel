import { Badge, type Tone } from '../ui';
import type { AuditEventType, CancellationOutcome, SubscriptionStatus } from '../../shared/types';

export const OUTCOME_META: Record<CancellationOutcome, { label: string; tone: Tone; help: string }> = {
  scheduled: { label: 'Scheduled', tone: 'info', help: 'Cancels at the end of the current period. Stripe confirmed it.' },
  canceled: { label: 'Canceled', tone: 'neutral', help: 'Canceled immediately. Stripe confirmed it.' },
  saved: { label: 'Saved', tone: 'success', help: 'The customer accepted an offer instead of canceling.' },
  unconfirmed: { label: 'Not confirmed', tone: 'danger', help: 'The customer asked to cancel, but Stripe did not confirm the change.' },
};

export function OutcomeBadge({ outcome }: { outcome: CancellationOutcome }) {
  const meta = OUTCOME_META[outcome];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export const STATUS_META: Record<SubscriptionStatus, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'success' },
  paused: { label: 'Paused', tone: 'warning' },
  canceled: { label: 'Canceled', tone: 'neutral' },
};

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const meta = STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export const EVENT_LABELS: Record<AuditEventType, string> = {
  cancel_requested: 'Cancel requested',
  offer_shown: 'Offer shown',
  offer_accepted: 'Offer accepted',
  stripe_update_sent: 'Stripe update sent',
  stripe_readback: 'Stripe read-back',
  confirmation_sent: 'Confirmation sent',
  alert_opened: 'Alert opened',
  alert_resolved: 'Alert resolved',
  settings_changed: 'Settings changed',
  reverified: 'Re-verified',
};

export const ALL_EVENT_TYPES = Object.keys(EVENT_LABELS) as AuditEventType[];

export const ACTOR_META: Record<'customer' | 'owner' | 'system', { label: string; tone: Tone }> = {
  customer: { label: 'Customer', tone: 'neutral' },
  owner: { label: 'Owner', tone: 'info' },
  system: { label: 'System', tone: 'neutral' },
};
