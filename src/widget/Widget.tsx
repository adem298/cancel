import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CancelTiming,
  OfferKind,
  ReasonId,
  WidgetApi,
  WidgetCancelResult,
  WidgetSession,
} from '../shared/types';
import { ApiError } from '../shared/types';
import { formatDate, formatUsdExact } from '../shared/format';
import { REASON_LABELS } from '../shared/catalog';

export type WidgetStep =
  | { name: 'loading' }
  | { name: 'error'; message: string }
  | { name: 'summary' }
  | { name: 'reason' }
  | { name: 'offer' }
  | { name: 'timing' }
  | { name: 'submitting' }
  | { name: 'cancelled'; result: Extract<WidgetCancelResult, { ok: true }> }
  | { name: 'unconfirmed'; supportEmail: string }
  | { name: 'saved'; summary: string }
  | { name: 'blocked'; message: string };

interface WidgetProps {
  api: WidgetApi;
  token: string;
  onClose: () => void;
  onOutcome: (detail: { outcome: string; cancellationId?: string }) => void;
  onSession?: (session: WidgetSession) => void;
}

const TIMING_HINT: Record<CancelTiming, string> = {
  period_end: 'Keep access until the end of the current billing period.',
  now: 'End access immediately.',
};

export function Widget({ api, token, onClose, onOutcome, onSession }: WidgetProps) {
  const [step, setStep] = useState<WidgetStep>({ name: 'loading' });
  const [session, setSession] = useState<WidgetSession | null>(null);
  const [reason, setReason] = useState<ReasonId | null>(null);
  const [timing, setTiming] = useState<CancelTiming>('period_end');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Load the session for this token. The token is validated server-side.
  useEffect(() => {
    let active = true;
    api
      .getSession(token)
      .then((s) => {
        if (!active) return;
        setSession(s);
        onSession?.(s);
        setTiming(s.defaultTiming);
        if (s.subscription.status === 'canceled') {
          setStep({ name: 'blocked', message: 'This subscription has already been cancelled.' });
        } else if (s.subscription.cancelAt) {
          setStep({
            name: 'blocked',
            message: `A cancellation is already scheduled. Access ends on ${formatDate(s.subscription.cancelAt)}.`,
          });
        } else {
          setStep({ name: 'summary' });
        }
      })
      .catch((e: unknown) => {
        if (!active) return;
        const message = e instanceof ApiError ? e.message : 'We could not load your billing details. Please try again.';
        setStep({ name: 'error', message });
      });
    return () => {
      active = false;
    };
  }, [api, token, onSession]);

  // Move focus to the heading of each new step.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step.name]);

  const go = (name: WidgetStep['name']) => {
    setError(null);
    setStep({ name } as WidgetStep);
  };

  const plan = session?.subscription;
  const endDate = plan ? formatDate(plan.currentPeriodEnd) : '';
  const accessEnd = timing === 'now' ? 'today' : endDate;

  const availableOffers = useMemo<OfferKind[]>(() => {
    if (!session || !reason) return [];
    return session.offers[reason] ?? [];
  }, [session, reason]);

  const acceptOffer = async (kind: OfferKind) => {
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.acceptOffer(token, { reason, kind, offersShown: availableOffers });
      setStep({ name: 'saved', summary: result.summary });
      onOutcome({ outcome: 'saved' });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'We could not apply that offer. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmCancel = async () => {
    if (!reason) return;
    setBusy(true);
    setError(null);
    setStep({ name: 'submitting' });
    try {
      const result = await api.cancel(token, { reason, timing, offersShown: availableOffers });
      if (result.ok) {
        setStep({ name: 'cancelled', result });
        onOutcome({ outcome: result.outcome, cancellationId: result.cancellationId });
      } else {
        setStep({ name: 'unconfirmed', supportEmail: result.supportEmail });
        onOutcome({ outcome: 'unconfirmed', cancellationId: result.cancellationId });
      }
    } catch (e) {
      // Network or validation failure: the cancellation did not happen. Say so plainly.
      setStep({ name: 'timing' });
      setError(e instanceof ApiError ? e.message : 'We could not reach our servers. Nothing was cancelled. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const chooseReasonAndContinue = () => {
    if (!reason || !session) return;
    const offers = session.offers[reason] ?? [];
    go(offers.length > 0 ? 'offer' : 'timing');
  };

  const header = (
    <header className="sb-header">
      <div className="sb-brand">
        <span className="sb-brand-name">{session?.business.displayName ?? 'Your subscription'}</span>
      </div>
      <button type="button" className="sb-close" aria-label="Close" onClick={onClose}>
        <CloseIcon />
      </button>
    </header>
  );

  return (
    <>
      {header}
      <div className="sb-body" aria-live="polite">
        {step.name === 'loading' && (
          <div role="status" className="sb-center">
            <div className="sb-spinner" aria-hidden="true" />
            <p className="sb-muted">Loading your subscription…</p>
          </div>
        )}

        {step.name === 'error' && (
          <div role="alert">
            <h2 className="sb-title" ref={headingRef} tabIndex={-1}>
              We could not open this page
            </h2>
            <p className="sb-lead">{step.message}</p>
            <div className="sb-footer">
              <button type="button" className="sb-btn" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}

        {step.name === 'blocked' && (
          <div>
            <h2 className="sb-title" ref={headingRef} tabIndex={-1}>
              Your subscription
            </h2>
            <p className="sb-notice">{step.message}</p>
            <div className="sb-footer">
              <span />
              <button type="button" className="sb-btn" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}

        {step.name === 'summary' && plan && session && (
          <div>
            <h2 className="sb-title" ref={headingRef} tabIndex={-1}>
              Cancel your subscription
            </h2>
            <p className="sb-lead">Before you go, here is what happens next. You can keep your subscription at any time.</p>
            <div className="sb-stack">
              <div className="sb-card">
                <dl className="sb-kv">
                  <dt>Plan</dt>
                  <dd>{plan.planName}</dd>
                  <dt>Price</dt>
                  <dd>{formatUsdExact(plan.priceUsd)} / month</dd>
                  <dt>Next renewal</dt>
                  <dd>{endDate}</dd>
                  <dt>Account</dt>
                  <dd>{plan.customerEmail}</dd>
                </dl>
              </div>
            </div>
            <div className="sb-footer">
              <button type="button" className="sb-link" onClick={onClose}>
                Keep my subscription
              </button>
              <button type="button" className="sb-btn sb-btn-primary" onClick={() => go('reason')}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step.name === 'reason' && session && (
          <div>
            <h2 className="sb-title" ref={headingRef} tabIndex={-1}>
              Why are you leaving?
            </h2>
            <p className="sb-lead">Pick the closest answer. It helps us improve the product.</p>
            <div role="radiogroup" aria-label="Reason for cancelling" className="sb-stack">
              {session.reasons.map((r) => {
                const checked = reason === r;
                return (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    className="sb-choice"
                    onClick={() => setReason(r)}
                  >
                    <span className="sb-radio" aria-hidden="true" />
                    <span>
                      <span className="sb-choice-title">{REASON_LABELS[r]}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="sb-footer">
              <button type="button" className="sb-link" onClick={() => go('summary')}>
                Back
              </button>
              <div className="sb-footer-group">
                <button type="button" className="sb-link" onClick={() => { setReason('other'); go('timing'); }}>
                  Skip and cancel
                </button>
                <button type="button" className="sb-btn sb-btn-primary" disabled={!reason} onClick={chooseReasonAndContinue}>
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {step.name === 'offer' && session && (
          <div>
            <h2 className="sb-title" ref={headingRef} tabIndex={-1}>
              Would one of these help?
            </h2>
            <p className="sb-lead">Optional. You can still cancel on the next step.</p>
            <div className="sb-stack">
              {availableOffers.map((kind) => {
                const detail = session.offerDetails[kind];
                if (!detail) return null;
                return (
                  <div className="sb-card" key={kind}>
                    <p className="sb-strong" style={{ margin: 0 }}>
                      {detail.label}
                    </p>
                    <p className="sb-muted" style={{ margin: '4px 0 12px' }}>
                      {detail.detail}
                    </p>
                    <button type="button" className="sb-btn sb-btn-primary sb-btn-block" disabled={busy} onClick={() => acceptOffer(kind)}>
                      Accept offer
                    </button>
                  </div>
                );
              })}
            </div>
            {error && (
              <p role="alert" className="sb-alert">
                {error}
              </p>
            )}
            <div className="sb-footer">
              <button type="button" className="sb-link" onClick={() => go('reason')}>
                Back
              </button>
              <button type="button" className="sb-btn" disabled={busy} onClick={() => go('timing')}>
                No thanks, continue to cancel
              </button>
            </div>
          </div>
        )}

        {step.name === 'timing' && session && (
          <div>
            <h2 className="sb-title" ref={headingRef} tabIndex={-1}>
              Confirm cancellation
            </h2>
            <p className="sb-lead">Choose when your access ends.</p>
            <div role="radiogroup" aria-label="When access ends" className="sb-stack">
              {(['period_end', 'now'] as const).map((t) => {
                const checked = timing === t;
                return (
                  <button key={t} type="button" role="radio" aria-checked={checked} className="sb-choice" onClick={() => setTiming(t)}>
                    <span className="sb-radio" aria-hidden="true" />
                    <span>
                      <span className="sb-choice-title">{t === 'period_end' ? 'At the end of the billing period' : 'Cancel now'}</span>
                      <span className="sb-choice-hint">
                        {t === 'period_end'
                          ? `Access continues until ${endDate}. No renewal charge after that date.`
                          : 'Access ends immediately. Refunds for unused time follow the business’s refund policy.'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="sb-card" style={{ marginTop: 16 }}>
              <dl className="sb-kv">
                <dt>Access ends</dt>
                <dd>{accessEnd}</dd>
                <dt>Charges after cancelling</dt>
                <dd>None</dd>
              </dl>
            </div>
            <p className="sb-muted" style={{ margin: '10px 0 0' }}>
              {TIMING_HINT[timing]} We will email the exact details to {plan?.customerEmail}.
            </p>

            {error && (
              <p role="alert" className="sb-alert">
                {error}
              </p>
            )}

            <div className="sb-footer">
              <button type="button" className="sb-link" onClick={() => go(availableOffers.length > 0 ? 'offer' : 'reason')}>
                Back
              </button>
              <button type="button" className="sb-btn sb-btn-primary" disabled={busy || !reason} onClick={confirmCancel}>
                Confirm cancellation
              </button>
            </div>
          </div>
        )}

        {step.name === 'submitting' && (
          <div role="status" className="sb-center">
            <div className="sb-spinner" aria-hidden="true" />
            <p className="sb-muted">Cancelling with Stripe and confirming the change…</p>
          </div>
        )}

        {step.name === 'cancelled' && (
          <div>
            <h2 className="sb-title" ref={headingRef} tabIndex={-1}>
              {step.result.outcome === 'canceled' ? 'Your subscription is cancelled' : 'Cancellation confirmed'}
            </h2>
            <p className="sb-lead">
              {step.result.outcome === 'canceled'
                ? 'Billing has stopped. Stripe confirmed the change.'
                : `Stripe confirmed your subscription will end on ${formatDate(step.result.accessEndsAt)}. You will not be charged again after that date.`}
            </p>
            <div className="sb-notice">
              A confirmation with the end date has been sent to <strong>{step.result.confirmationSentTo}</strong>.
            </div>
            <div className="sb-footer">
              <span />
              <button type="button" className="sb-btn" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}

        {step.name === 'unconfirmed' && (
          <div>
            <h2 className="sb-title" ref={headingRef} tabIndex={-1}>
              We could not confirm your cancellation
            </h2>
            <p className="sb-lead">
              Your subscription has <strong>not</strong> been cancelled yet. The business has been notified. To finish cancelling, contact {step.supportEmail}.
            </p>
            <div className="sb-footer">
              <button type="button" className="sb-link" onClick={onClose}>
                Close
              </button>
              <button type="button" className="sb-btn" onClick={() => go('timing')}>
                Try again
              </button>
            </div>
          </div>
        )}

        {step.name === 'saved' && (
          <div>
            <h2 className="sb-title" ref={headingRef} tabIndex={-1}>
              Offer applied. You are still subscribed.
            </h2>
            <p className="sb-notice">{step.summary}</p>
            <div className="sb-footer">
              <span />
              <button type="button" className="sb-btn sb-btn-primary" onClick={onClose}>
                Back to my account
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
