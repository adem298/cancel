/**
 * Domain model and API contract shared by the owner dashboard, the cancel
 * widget, and the (future) backend. Keep this file free of runtime code.
 */

export type PlanId = 'starter' | 'growth' | 'scale';

export type ReasonId = 'too_expensive' | 'not_using' | 'missing_feature' | 'switching_tool' | 'other';

export type OfferKind = 'discount' | 'pause' | 'downgrade';

export type CancelTiming = 'period_end' | 'now';

/** Outcome after the billing check has run. */
export type CancellationOutcome = 'scheduled' | 'canceled' | 'saved' | 'unconfirmed';

export type SubscriptionStatus = 'active' | 'canceled' | 'paused';

export type RangeKey = '7d' | '30d' | '90d';

export interface Plan {
  id: PlanId;
  name: string;
  priceUsd: number;
  subscriptionLimit: number;
}

export interface Subscription {
  id: string;
  customerEmail: string; // masked for display, e.g. "m•••@acme.io"
  planId: PlanId;
  status: SubscriptionStatus;
  priceUsd: number;
  currentPeriodEnd: string; // ISO 8601
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  discountPercentOff: number | null;
  discountEndsAt: string | null;
  pauseResumesAt: string | null;
  pendingPlanId: PlanId | null; // applied at the next billing period
  createdAt: string;
}

export interface StripeReadback {
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  verifiedAt: string;
}

export interface CancellationRecord {
  id: string;
  subscriptionId: string;
  customerEmail: string;
  planId: PlanId;
  priceUsd: number;
  reason: ReasonId | null;
  timing: CancelTiming;
  offersShown: OfferKind[];
  offerAccepted: OfferKind | null;
  outcome: CancellationOutcome;
  accessEndsAt: string;
  readback: StripeReadback | null;
  mrrKeptUsd: number;
  alertId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AuditEventType =
  | 'cancel_requested'
  | 'offer_shown'
  | 'offer_accepted'
  | 'stripe_update_sent'
  | 'stripe_readback'
  | 'confirmation_sent'
  | 'alert_opened'
  | 'alert_resolved'
  | 'settings_changed'
  | 'reverified';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  at: string;
  actor: 'customer' | 'owner' | 'system';
  subscriptionId: string | null;
  cancellationId: string | null;
  summary: string;
}

export interface Alert {
  id: string;
  status: 'open' | 'resolved';
  subscriptionId: string;
  cancellationId: string;
  expectedState: string;
  actualStatus: SubscriptionStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export interface OverviewPoint {
  date: string; // YYYY-MM-DD (UTC)
  cancellations: number;
  saved: number;
}

export interface Overview {
  range: RangeKey;
  totals: {
    cancellations: number;
    saved: number;
    saveRate: number; // 0..1
    mrrKeptUsd: number;
    openAlerts: number;
    verifiedRate: number; // 0..1, share of cancellations confirmed by Stripe
  };
  series: OverviewPoint[];
  reasons: { reason: ReasonId; count: number; share: number }[];
  recent: CancellationRecord[];
}

export interface CancellationDetail {
  record: CancellationRecord;
  subscription: Subscription | null;
  events: AuditEvent[];
  alert: Alert | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CancellationQuery {
  search?: string;
  outcome?: CancellationOutcome | 'all';
  reason?: ReasonId | 'all';
  page: number;
  pageSize: number;
}

export interface ActivityQuery {
  type?: AuditEventType | 'all';
  page: number;
  pageSize: number;
}

export interface Session {
  name: string;
  email: string;
  businessName: string;
}

export interface Settings {
  brand: {
    displayName: string;
    accentColor: string; // #rrggbb
    supportEmail: string;
  };
  defaultTiming: CancelTiming;
  reasons: Record<ReasonId, { enabled: boolean; offers: OfferKind[] }>;
  offers: {
    discount: { percentOff: number; months: number };
    pause: { months: number };
    downgrade: { targetPlan: PlanId };
  };
  alerts: { notifyEmail: string };
  stripe: { mode: 'test' | 'live'; accountId: string; connectedAt: string; scopes: string[] };
}

/** Demo-only switches. Not part of the production contract. */
export interface DemoControls {
  simulateStripeFailure: boolean;
}

// ---- Widget contract -------------------------------------------------------

export interface WidgetSession {
  business: { displayName: string; accentColor: string; supportEmail: string };
  subscription: {
    id: string;
    planName: string;
    priceUsd: number;
    status: SubscriptionStatus;
    currentPeriodEnd: string;
    customerEmail: string;
    cancelAt: string | null; // set when a cancellation is already scheduled
  };
  defaultTiming: CancelTiming;
  reasons: ReasonId[];
  offers: Record<ReasonId, OfferKind[]>;
  offerDetails: Partial<Record<OfferKind, { label: string; detail: string }>>;
}

export interface WidgetCancelInput {
  reason: ReasonId;
  timing: CancelTiming;
  offersShown: OfferKind[];
}

export type WidgetCancelResult =
  | {
      ok: true;
      outcome: 'scheduled' | 'canceled';
      accessEndsAt: string;
      confirmationSentTo: string;
      cancellationId: string;
    }
  | {
      ok: false;
      reason: 'billing_not_confirmed';
      cancellationId: string;
      supportEmail: string;
    };

export interface WidgetOfferInput {
  reason: ReasonId;
  kind: OfferKind;
  offersShown: OfferKind[];
}

export interface WidgetOfferResult {
  kind: OfferKind;
  effectiveFrom: string;
  summary: string;
}

// ---- Dashboard contract ----------------------------------------------------

export interface DashboardApi {
  readonly mode: 'demo' | 'live';
  getSession(): Promise<Session | null>;
  signIn(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
  getOverview(range: RangeKey): Promise<Overview>;
  listCancellations(query: CancellationQuery): Promise<Page<CancellationRecord>>;
  getCancellation(id: string): Promise<CancellationDetail>;
  reverifyCancellation(id: string): Promise<CancellationDetail>;
  retryCancellation(id: string): Promise<CancellationDetail>;
  listAlerts(status: 'open' | 'resolved' | 'all'): Promise<Alert[]>;
  resolveAlert(id: string, note: string): Promise<Alert>;
  listActivity(query: ActivityQuery): Promise<Page<AuditEvent>>;
  getSettings(): Promise<Settings>;
  updateSettings(next: Settings): Promise<Settings>;
  getDemoControls(): Promise<DemoControls>;
  setDemoControls(next: DemoControls): Promise<DemoControls>;
  resetDemoData(): Promise<void>;
}

export interface WidgetApi {
  getSession(token: string): Promise<WidgetSession>;
  acceptOffer(token: string, input: WidgetOfferInput): Promise<WidgetOfferResult>;
  cancel(token: string, input: WidgetCancelInput): Promise<WidgetCancelResult>;
}

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
