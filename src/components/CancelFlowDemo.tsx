import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CircleCheck,
  Loader2,
  Mail,
  Pause,
  TriangleAlert,
  TrendingDown,
  Tag,
} from 'lucide-react';
import { Section } from './Section';
import {
  REASONS,
  accessEndsAt,
  addMonthsUnix,
  formatDate,
  offersForReason,
  simulateCancel,
  verifyCancellation,
  type CancelMode,
  type CancelReasonId,
  type SaveOffer,
  type SimulatedSubscription,
  type VerificationResult,
} from '../lib/billing';

type Screen = 'account' | 'reason' | 'offer' | 'confirm' | 'working' | 'cancelled' | 'saved';

const PLAN = { name: 'Growth', priceUsd: 79 } as const;
const CUSTOMER_EMAIL = 'customer@example.com';
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

type Outcome =
  | { kind: 'cancelled'; sub: SimulatedSubscription; verification: VerificationResult; mode: CancelMode }
  | { kind: 'saved'; offer: SaveOffer };

export function CancelFlowDemo() {
  // Captured once per mount so the demo stays internally consistent.
  const [now] = useState(() => Math.floor(Date.now() / 1000));
  const periodEnd = useMemo(() => addMonthsUnix(now, 1), [now]);
  const baseSub = useMemo<SimulatedSubscription>(
    () => ({
      id: 'sub_1Q8fK2demo',
      status: 'active',
      cancel_at_period_end: false,
      cancel_at: null,
      current_period_end: periodEnd,
    }),
    [periodEnd],
  );

  const [screen, setScreen] = useState<Screen>('account');
  const [reason, setReason] = useState<CancelReasonId | null>(null);
  const [mode, setMode] = useState<CancelMode>('period_end');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const offers = useMemo(() => (reason ? offersForReason(reason, PLAN.priceUsd) : []), [reason]);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to each new screen's heading so keyboard and screen reader users follow the flow.
  useEffect(() => {
    if (screen !== 'account') headingRef.current?.focus();
  }, [screen]);

  // Simulate the Stripe call and read-back.
  useEffect(() => {
    if (screen !== 'working') return;
    const timer = window.setTimeout(() => {
      const requested = simulateCancel(baseSub, mode, now);
      // In "simulate failure" mode, the write never reaches Stripe. The read-back shows the truth.
      const actual = simulateFailure ? baseSub : requested;
      setOutcome({
        kind: 'cancelled',
        sub: actual,
        verification: verifyCancellation(actual, formatDate),
        mode,
      });
      setScreen('cancelled');
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [screen, baseSub, mode, now, simulateFailure]);

  const reset = () => {
    setScreen('account');
    setReason(null);
    setMode('period_end');
    setSimulateFailure(false);
    setOutcome(null);
  };

  const endDate = formatDate(accessEndsAt(mode, periodEnd, now));
  const stepLabels = offers.length > 0 ? ['Reason', 'Offer', 'Confirm'] : ['Reason', 'Confirm'];
  const currentStep = (() => {
    if (screen === 'reason') return 0;
    if (screen === 'offer') return 1;
    if (screen === 'confirm' || screen === 'working') return stepLabels.length - 1;
    return -1;
  })();

  return (
    <Section
      id="demo"
      eyebrow="Live demo"
      title="Walk through the flow as your customer would."
      description="This is an interactive preview with simulated data. No requests are sent to Stripe. Turn on the failure switch on the confirm step to see the billing check catch a cancellation that did not apply."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-14">
        <aside className="space-y-6 lg:pt-4">
          <ul className="space-y-5">
            {[
              ['Two to three clicks.', 'From the billing page to a confirmed cancellation.'],
              ['“No thanks, cancel” on every step.', 'Save offers are optional and never block the exit.'],
              ['The end date comes before the button.', 'Customers see when access ends and any final charge.'],
              ['Confirmed by Stripe, not assumed.', 'The result appears only after the subscription is read back.'],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-3.5">
                <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <CircleCheck className="size-3.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium text-ink">{title}</p>
                  <p className="mt-0.5 text-sm text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-line bg-surface/60 p-4 text-sm text-muted">
            <p className="font-medium text-ink-2">Save offers follow the reason</p>
            <p className="mt-1">
              “It costs too much” shows a discount or a downgrade. “Not using it enough” shows a pause. Reasons that a
              discount would not solve go straight to cancellation.
            </p>
          </div>
        </aside>

        <div className="panel overflow-hidden" role="region" aria-label="Interactive cancel flow preview">
          {/* Browser chrome */}
          <div className="flex items-center gap-3 border-b border-line bg-surface-2 px-4 py-3">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
            </span>
            <span className="min-w-0 flex-1 truncate rounded-md bg-canvas px-3 py-1 text-center font-mono text-xs text-muted">
              app.acme.io/settings/billing
            </span>
          </div>

          <div className="p-6 sm:p-8">
            {/* Progress */}
            {currentStep >= 0 && (
              <ol className="mb-8 flex items-center gap-2" aria-label="Progress">
                {stepLabels.map((label, i) => (
                  <li key={label} className="flex flex-1 items-center gap-2">
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full font-mono text-[0.7rem] font-medium ${
                        i <= currentStep ? 'bg-accent text-canvas' : 'bg-surface-3 text-faint'
                      }`}
                      aria-current={i === currentStep ? 'step' : undefined}
                    >
                      {i + 1}
                    </span>
                    <span className={`truncate text-xs ${i <= currentStep ? 'text-ink-2' : 'text-faint'}`}>{label}</span>
                    {i < stepLabels.length - 1 && <span className="ml-1 h-px flex-1 bg-line-strong" aria-hidden="true" />}
                  </li>
                ))}
              </ol>
            )}

            {screen === 'account' && (
              <div className="space-y-6">
                <div>
                  <h3 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-ink outline-none">
                    Billing
                  </h3>
                  <p className="mt-1 text-sm text-muted">Manage your plan and payment details.</p>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted">Current plan</p>
                      <p className="mt-1 text-lg font-semibold text-ink">
                        {PLAN.name} · {money.format(PLAN.priceUsd)} / month
                      </p>
                    </div>
                    <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">Active</span>
                  </div>
                  <p className="mt-3 text-sm text-muted">Renews {formatDate(periodEnd)}</p>
                </div>
                <div>
                  <button type="button" className="btn-secondary w-full py-3" onClick={() => setScreen('reason')}>
                    Cancel subscription
                  </button>
                  <p className="mt-3 text-center text-xs text-faint">Nothing is sent to Stripe in this preview.</p>
                </div>
              </div>
            )}

            {screen === 'reason' && (
              <div className="space-y-6">
                <div>
                  <h3 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-ink outline-none">
                    Why are you leaving?
                  </h3>
                  <p className="mt-1 text-sm text-muted">One choice helps us improve. It takes a few seconds.</p>
                </div>

                <div role="radiogroup" aria-label="Reason for cancelling" className="grid gap-2.5">
                  {REASONS.map((r) => {
                    const checked = reason === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() => setReason(r.id)}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                          checked
                            ? 'border-accent/60 bg-accent-soft'
                            : 'border-line bg-canvas hover:border-line-strong hover:bg-surface-2'
                        }`}
                      >
                        <span
                          className={`grid size-4 shrink-0 place-items-center rounded-full border ${
                            checked ? 'border-accent' : 'border-line-strong'
                          }`}
                          aria-hidden="true"
                        >
                          {checked && <span className="size-2 rounded-full bg-accent" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-ink">{r.label}</span>
                          <span className="block text-xs text-muted">{r.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <StepFooter
                  back={() => setScreen('account')}
                  backLabel="Back"
                  primary={
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={!reason}
                      onClick={() => setScreen(offers.length > 0 ? 'offer' : 'confirm')}
                    >
                      Continue
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </button>
                  }
                  exit={() => setScreen('confirm')}
                />
              </div>
            )}

            {screen === 'offer' && (
              <div className="space-y-6">
                <div>
                  <h3 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-ink outline-none">
                    Would one of these help?
                  </h3>
                  <p className="mt-1 text-sm text-muted">Optional. You can still cancel on the next step.</p>
                </div>

                <div className="grid gap-3">
                  {offers.map((offer) => (
                    <div key={offer.label} className="rounded-xl border border-line bg-canvas p-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-3 text-accent">
                          <OfferIcon offer={offer} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-ink">{offer.label}</p>
                          <p className="mt-1 text-sm text-muted">{offer.detail}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-primary mt-4 w-full py-2.5"
                        onClick={() => {
                          setOutcome({ kind: 'saved', offer });
                          setScreen('saved');
                        }}
                      >
                        Accept offer
                      </button>
                    </div>
                  ))}
                </div>

                <StepFooter
                  back={() => setScreen('reason')}
                  backLabel="Back"
                  exit={() => setScreen('confirm')}
                />
              </div>
            )}

            {screen === 'confirm' && (
              <div className="space-y-6">
                <div>
                  <h3 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-ink outline-none">
                    Confirm cancellation
                  </h3>
                  <p className="mt-1 text-sm text-muted">Choose when access ends.</p>
                </div>

                <div role="radiogroup" aria-label="When to cancel" className="grid gap-2.5">
                  {(
                    [
                      {
                        id: 'period_end' as const,
                        label: 'At the end of the billing period',
                        hint: `Access continues until ${formatDate(periodEnd)}. No renewal charge after that date.`,
                      },
                      {
                        id: 'now' as const,
                        label: 'Cancel now',
                        hint: 'Access ends immediately. Refunds for unused time follow your refund policy.',
                      },
                    ]
                  ).map((opt) => {
                    const checked = mode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() => setMode(opt.id)}
                        className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                          checked ? 'border-accent/60 bg-accent-soft' : 'border-line bg-canvas hover:border-line-strong'
                        }`}
                      >
                        <span
                          className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${
                            checked ? 'border-accent' : 'border-line-strong'
                          }`}
                          aria-hidden="true"
                        >
                          {checked && <span className="size-2 rounded-full bg-accent" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-ink">{opt.label}</span>
                          <span className="block text-xs leading-relaxed text-muted">{opt.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <dl className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-canvas p-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Access ends</dt>
                    <dd className="mt-1 font-semibold text-ink">{endDate}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Charges after cancelling</dt>
                    <dd className="mt-1 font-semibold text-ink">None</dd>
                  </div>
                </dl>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dashed border-line-strong p-4 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-[var(--color-accent)]"
                    checked={simulateFailure}
                    onChange={(e) => setSimulateFailure(e.target.checked)}
                  />
                  <span>
                    <span className="block font-medium text-ink-2">Simulate a Stripe update that does not apply</span>
                    <span className="block text-xs text-muted">
                      Demo only. This is the silent failure that Stopbill’s billing check is designed to catch.
                    </span>
                  </span>
                </label>

                <StepFooter
                  back={() => setScreen(offers.length > 0 ? 'offer' : 'reason')}
                  backLabel="Back"
                  primary={
                    <button type="button" className="btn-primary" onClick={() => setScreen('working')}>
                      Confirm cancellation
                    </button>
                  }
                />
              </div>
            )}

            {screen === 'working' && (
              <div className="flex flex-col items-center py-14 text-center" role="status" aria-live="polite">
                <Loader2 className="size-8 animate-spin text-accent motion-reduce:animate-none" aria-hidden="true" />
                <p className="mt-5 font-medium text-ink">Cancelling in Stripe…</p>
                <p className="mt-1 text-sm text-muted">Reading the subscription back to confirm the change.</p>
              </div>
            )}

            {screen === 'cancelled' && outcome?.kind === 'cancelled' && (
              <div className="space-y-6">
                {outcome.verification.ok ? (
                  <div className="flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                      <BadgeCheck className="size-6" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-ink outline-none">
                        Cancellation confirmed
                      </h3>
                      <p className="mt-1 text-sm text-muted">Verified against Stripe. {outcome.verification.message}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-danger-soft text-danger">
                      <TriangleAlert className="size-6" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-ink outline-none">
                        We could not confirm your cancellation
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        The customer sees a clear message. They are not told they are cancelled.
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-line bg-canvas p-4">
                  <p className="mb-3 font-mono text-[0.7rem] tracking-wider text-faint uppercase">Stripe read-back</p>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-mono text-[0.8rem]">
                    <dt className="text-faint">id</dt>
                    <dd className="text-ink-2">{outcome.sub.id}</dd>
                    <dt className="text-faint">status</dt>
                    <dd className={outcome.sub.status === 'canceled' ? 'text-accent' : 'text-ink-2'}>
                      {outcome.sub.status}
                    </dd>
                    <dt className="text-faint">cancel_at_period_end</dt>
                    <dd className={outcome.sub.cancel_at_period_end ? 'text-accent' : 'text-ink-2'}>
                      {String(outcome.sub.cancel_at_period_end)}
                    </dd>
                    <dt className="text-faint">cancel_at</dt>
                    <dd className="text-ink-2">
                      {outcome.sub.cancel_at ? formatDate(outcome.sub.cancel_at) : 'null'}
                    </dd>
                  </dl>
                </div>

                {outcome.verification.ok ? (
                  <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent-soft p-4 text-sm text-ink-2">
                    <Mail className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                    <p>
                      Confirmation sent to <span className="font-medium text-ink">{CUSTOMER_EMAIL}</span> with the end
                      date ({endDate}) and what happens to their data.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-soft p-4 text-sm text-ink-2">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
                    <p>
                      No confirmation email was sent, because the cancellation is not confirmed. The owner has been
                      alerted to review this subscription.
                    </p>
                  </div>
                )}

                <button type="button" className="btn-secondary w-full py-2.5" onClick={reset}>
                  Restart demo
                </button>
              </div>
            )}

            {screen === 'saved' && outcome?.kind === 'saved' && (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <BadgeCheck className="size-6" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-ink outline-none">
                      Offer applied. You are still subscribed.
                    </h3>
                    <p className="mt-1 text-sm text-muted">{savedSummary(outcome.offer, periodEnd, now)}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-4 text-sm text-ink-2">
                  Stripe status: <span className="font-mono text-accent">active</span>. Your plan and data are unchanged.
                </div>
                <button type="button" className="btn-secondary w-full py-2.5" onClick={reset}>
                  Restart demo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

function OfferIcon({ offer }: { offer: SaveOffer }) {
  const props = { className: 'size-4', 'aria-hidden': true } as const;
  if (offer.kind === 'discount') return <Tag {...props} />;
  if (offer.kind === 'pause') return <Pause {...props} />;
  return <TrendingDown {...props} />;
}

function savedSummary(offer: SaveOffer, periodEnd: number, now: number): string {
  if (offer.kind === 'discount') {
    const next = PLAN.priceUsd * (1 - offer.percentOff / 100);
    return `${offer.percentOff}% off for ${offer.months} months. Your next invoice is ${money.format(next)}, then your regular price resumes.`;
  }
  if (offer.kind === 'pause') {
    return `Billing is paused for ${offer.months} months. Billing resumes on ${formatDate(addMonthsUnix(now, offer.months))}.`;
  }
  return `Your plan changes to ${offer.toPlan} at ${money.format(offer.toPriceUsd)} / month from ${formatDate(periodEnd)}.`;
}

function StepFooter({
  back,
  backLabel,
  primary,
  exit,
}: {
  back: () => void;
  backLabel: string;
  primary?: ReactNode;
  exit?: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <button type="button" className="btn-ghost px-2 py-2" onClick={back}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          {backLabel}
        </button>
        {exit && (
          <button type="button" className="btn-ghost px-2 py-2 text-muted hover:text-danger" onClick={exit}>
            No thanks, cancel
          </button>
        )}
      </div>
      {primary}
    </div>
  );
}
