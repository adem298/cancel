import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, FlaskConical, RotateCcw, Save } from 'lucide-react';
import { ApiError, type CancelTiming, type DemoControls, type OfferKind, type ReasonId, type Settings } from '../../shared/types';
import { PLANS, REASON_LABELS, OFFER_LABELS, TIMING_LABELS } from '../../shared/catalog';
import { isValidEmail, formatDateTime } from '../../shared/format';
import { accentIssues, isHexColor, readableInkOn } from '../../shared/color';
import { Badge, Button, Card, ErrorState, Field, InlineAlert, LoadingBlock, PageHeader, Skeleton, Toggle, inputClass, useDocumentTitle, useFieldId, useToast } from '../ui';
import { dashboardApi, keys, useDemoControls, useSettings } from '../lib/api';

const REASONS = Object.keys(REASON_LABELS) as ReasonId[];
const OFFER_KINDS: OfferKind[] = ['discount', 'pause', 'downgrade'];
const SECTIONS = [
  { id: 'brand', label: 'Brand' },
  { id: 'flow', label: 'Cancel flow' },
  { id: 'offers', label: 'Offer terms' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'stripe', label: 'Stripe' },
  { id: 'install', label: 'Install' },
] as const;

export function SettingsPage() {
  useDocumentTitle('Settings');
  const settings = useSettings();
  const demo = useDemoControls();
  const isDemo = dashboardApi.mode === 'demo';

  return (
    <>
      <PageHeader title="Settings" description="Brand, cancel flow, offer terms, and alert routing. Changes apply to the next widget load." />
      {settings.isError ? (
        <ErrorState message="Settings could not be loaded." onRetry={() => settings.refetch()} />
      ) : !settings.data ? (
        <div className="space-y-4"><Skeleton className="h-40 w-full" /><div className="panel"><LoadingBlock label="Loading settings" /></div></div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[180px_1fr]">
          <nav aria-label="Settings sections" className="hidden lg:block">
            <ul className="sticky top-8 space-y-1 text-sm">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-md px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-ink">{s.label}</a>
                </li>
              ))}
              {isDemo && (
                <li>
                  <a href="#demo" className="block rounded-md px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-ink">Demo controls</a>
                </li>
              )}
            </ul>
          </nav>
          <div className="min-w-0">
            <SettingsForm initial={settings.data} />
            {isDemo && demo.data && <DemoControlsCard controls={demo.data} />}
          </div>
        </div>
      )}
    </>
  );
}

function validate(s: Settings): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = s.brand.displayName.trim();
  if (name.length < 2 || name.length > 60) errors.displayName = 'Use between 2 and 60 characters.';
  if (!isHexColor(s.brand.accentColor)) errors.accentColor = 'Use a 6-digit hex color, such as #34d399.';
  else {
    const issue = accentIssues(s.brand.accentColor)[0];
    if (issue) errors.accentColor = issue;
  }
  if (!isValidEmail(s.brand.supportEmail)) errors.supportEmail = 'Enter a valid support email.';
  if (!isValidEmail(s.alerts.notifyEmail)) errors.notifyEmail = 'Enter a valid email for alerts.';
  return errors;
}

function SettingsForm({ initial }: { initial: Settings }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [saved, setSaved] = useState<Settings>(initial);
  const [draft, setDraft] = useState<Settings>(initial);
  const [formError, setFormError] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const errors = validate(draft);
  const hasErrors = Object.keys(errors).length > 0;

  const save = useMutation({
    mutationFn: (next: Settings) => dashboardApi.updateSettings(next),
    onSuccess: (result) => {
      setSaved(result);
      setDraft(result);
      setFormError(null);
      queryClient.setQueryData(keys.settings(), result);
      toast.notify('success', 'Settings saved.');
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : 'Settings could not be saved. Try again.';
      setFormError(message);
      toast.notify('error', message);
    },
  });

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasErrors) {
      setFormError('Fix the highlighted fields before saving.');
      return;
    }
    save.mutate({ ...draft, brand: { ...draft.brand, displayName: draft.brand.displayName.trim() } });
  };

  const nameId = useFieldId('display-name');
  const colorId = useFieldId('accent');
  const colorTextId = useFieldId('accent-text');
  const supportId = useFieldId('support');
  const notifyId = useFieldId('notify');
  const discountId = useFieldId('discount');
  const discountMonthsId = useFieldId('discount-months');
  const pauseId = useFieldId('pause-months');
  const targetId = useFieldId('target-plan');

  const accent = isHexColor(draft.brand.accentColor) ? draft.brand.accentColor : '#34d399';

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8 pb-24">
      {formError && <InlineAlert>{formError}</InlineAlert>}

      <section id="brand" className="scroll-mt-8">
        <Card title="Brand" description="Shown in the widget header, confirmation emails, and the support link.">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Business name" htmlFor={nameId} error={errors.displayName}>
              <input id={nameId} className={inputClass} value={draft.brand.displayName}
                onChange={(e) => set('brand', { ...draft.brand, displayName: e.target.value })} aria-invalid={Boolean(errors.displayName) || undefined} />
            </Field>
            <Field label="Support email" htmlFor={supportId} error={errors.supportEmail} hint="Shown when a cancellation cannot be confirmed.">
              <input id={supportId} type="email" className={inputClass} value={draft.brand.supportEmail}
                onChange={(e) => set('brand', { ...draft.brand, supportEmail: e.target.value })} aria-invalid={Boolean(errors.supportEmail) || undefined} />
            </Field>
            <Field label="Accent color" htmlFor={colorTextId} error={errors.accentColor} hint="Must pass 4.5:1 contrast on the widget background.">
              <div className="flex items-center gap-2">
                <input id={colorId} type="color" aria-label="Pick accent color" value={accent}
                  onChange={(e) => set('brand', { ...draft.brand, accentColor: e.target.value })}
                  className="h-10 w-12 cursor-pointer rounded-md border border-line-strong bg-canvas p-1" />
                <input id={colorTextId} className={`${inputClass} font-mono`} value={draft.brand.accentColor}
                  onChange={(e) => set('brand', { ...draft.brand, accentColor: e.target.value })} aria-invalid={Boolean(errors.accentColor) || undefined} />
              </div>
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink-2">Preview</p>
              <div className="flex items-center gap-3 rounded-lg border border-line bg-canvas p-3">
                <span className="rounded-md px-3.5 py-2 text-sm font-medium" style={{ background: accent, color: readableInkOn(accent) }}>
                  Cancel subscription
                </span>
                <span className="text-xs text-faint">Launcher button</span>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section id="flow" className="scroll-mt-8">
        <Card title="Cancel flow" description="Choose which reasons appear and which save offers each reason can trigger. Customers always see “No thanks, cancel”.">
          <fieldset className="mb-6">
            <legend className="mb-2 text-sm font-medium text-ink-2">Default timing</legend>
            <div className="flex flex-wrap gap-3">
              {(['period_end', 'now'] as CancelTiming[]).map((t) => (
                <label key={t} className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                  draft.defaultTiming === t ? 'border-accent bg-accent-soft text-ink' : 'border-line-strong text-ink-2 hover:bg-surface-2'}`}>
                  <input type="radio" name="timing" className="accent-[var(--color-accent)]" checked={draft.defaultTiming === t}
                    onChange={() => set('defaultTiming', t)} />
                  {TIMING_LABELS[t]}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-faint">Customers can choose either option on the timing step.</p>
          </fieldset>

          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[560px] text-left text-sm">
              <caption className="sr-only">Reasons and offers</caption>
              <thead>
                <tr className="border-b border-line bg-canvas/50 text-xs tracking-wide text-muted uppercase">
                  <th scope="col" className="px-4 py-3 font-medium">Reason</th>
                  <th scope="col" className="px-4 py-3 font-medium">Shown</th>
                  {OFFER_KINDS.map((k) => (
                    <th key={k} scope="col" className="px-4 py-3 font-medium">{OFFER_LABELS[k]}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {REASONS.map((r) => {
                  const row = draft.reasons[r];
                  return (
                    <tr key={r}>
                      <th scope="row" className="px-4 py-3 text-left font-normal text-ink-2">{REASON_LABELS[r]}</th>
                      <td className="px-4 py-3">
                        <Toggle label={`Show “${REASON_LABELS[r]}”`} checked={row.enabled}
                          onChange={(v) => set('reasons', { ...draft.reasons, [r]: { ...row, enabled: v } })} />
                      </td>
                      {OFFER_KINDS.map((k) => {
                        const on = row.offers.includes(k);
                        return (
                          <td key={k} className="px-4 py-3">
                            <input type="checkbox" className="size-4 accent-[var(--color-accent)]" aria-label={`${OFFER_LABELS[k]} for “${REASON_LABELS[r]}”`}
                              disabled={!row.enabled} checked={on}
                              onChange={(e) => {
                                const offers = e.target.checked ? [...row.offers, k] : row.offers.filter((x) => x !== k);
                                set('reasons', { ...draft.reasons, [r]: { ...row, offers } });
                              }} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-faint">A downgrade is only offered when the target plan costs less than the customer’s current plan.</p>
        </Card>
      </section>

      <section id="offers" className="scroll-mt-8">
        <Card title="Offer terms" description="The exact terms shown to the customer. The widget states the end date before any change is made.">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Discount" htmlFor={discountId} hint="Percent off each invoice during the discount period.">
              <select id={discountId} className={inputClass} value={draft.offers.discount.percentOff}
                onChange={(e) => set('offers', { ...draft.offers, discount: { ...draft.offers.discount, percentOff: Number(e.target.value) } })}>
                {[10, 15, 20, 25, 30, 40, 50].map((p) => <option key={p} value={p}>{p}% off</option>)}
              </select>
            </Field>
            <Field label="Discount length" htmlFor={discountMonthsId} hint="Between one and three months.">
              <select id={discountMonthsId} className={inputClass} value={draft.offers.discount.months}
                onChange={(e) => set('offers', { ...draft.offers, discount: { ...draft.offers.discount, months: Number(e.target.value) } })}>
                {[1, 2, 3].map((m) => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
              </select>
            </Field>
            <Field label="Pause length" htmlFor={pauseId} hint="Billing stops and resumes automatically. Between one and three months.">
              <select id={pauseId} className={inputClass} value={draft.offers.pause.months}
                onChange={(e) => set('offers', { ...draft.offers, pause: { months: Number(e.target.value) } })}>
                {[1, 2, 3].map((m) => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
              </select>
            </Field>
            <Field label="Downgrade target" htmlFor={targetId} hint="Takes effect at the start of the next billing period.">
              <select id={targetId} className={inputClass} value={draft.offers.downgrade.targetPlan}
                onChange={(e) => set('offers', { ...draft.offers, downgrade: { targetPlan: e.target.value as Settings['offers']['downgrade']['targetPlan'] } })}>
                {PLANS.map((p) => <option key={p.id} value={p.id}>{p.name} · ${p.priceUsd}/mo</option>)}
              </select>
            </Field>
          </div>
        </Card>
      </section>

      <section id="alerts" className="scroll-mt-8">
        <Card title="Alerts" description="Where to send an alert when Stripe does not confirm a cancellation.">
          <Field label="Alert email" htmlFor={notifyId} error={errors.notifyEmail}>
            <input id={notifyId} type="email" className={`${inputClass} md:max-w-md`} value={draft.alerts.notifyEmail}
              onChange={(e) => set('alerts', { notifyEmail: e.target.value })} aria-invalid={Boolean(errors.notifyEmail) || undefined} />
          </Field>
        </Card>
      </section>

      <section id="stripe" className="scroll-mt-8">
        <Card
          title="Stripe connection"
          description="Connected with Stripe OAuth using restricted access. Stopbill never stores your full secret key and never sees card numbers."
          actions={<Badge tone={draft.stripe.mode === 'live' ? 'success' : 'warning'}>{draft.stripe.mode === 'live' ? 'Live mode' : 'Test mode'}</Badge>}
        >
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-muted">Account</dt><dd className="mt-1 font-mono text-ink-2">{draft.stripe.accountId}</dd></div>
            <div><dt className="text-xs text-muted">Connected</dt><dd className="mt-1 text-ink-2">{formatDateTime(draft.stripe.connectedAt)}</dd></div>
            <div><dt className="text-xs text-muted">Scopes</dt><dd className="mt-1 flex flex-wrap gap-1.5">{draft.stripe.scopes.map((s) => <Badge key={s}>{s}</Badge>)}</dd></div>
          </dl>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Button disabled>Reconnect Stripe</Button>
            <span className="text-xs text-faint">Reconnecting is available once the live account flow ships.</span>
          </div>
        </Card>
      </section>

      <section id="install" className="scroll-mt-8">
        <InstallCard />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 backdrop-blur" role="region" aria-label="Save changes" hidden={!dirty}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <p className="text-sm text-muted" role="status">
            {hasErrors ? 'Fix the highlighted fields to save.' : 'You have unsaved changes.'}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setDraft(saved); setFormError(null); }}>Discard</Button>
            <Button type="submit" variant="primary" busy={save.isPending} disabled={hasErrors || !dirty}>
              <Save className="size-4" aria-hidden="true" />
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

const SNIPPET = `<script
  src="https://cdn.stopbill.dev/v1/stopbill.js"
  data-token="SIGNED_CUSTOMER_TOKEN"
  data-label="Cancel subscription"
  async
></script>`;

function InstallCard() {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SNIPPET);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.notify('error', 'Copy failed. Select the snippet and copy it manually.');
    }
  };
  return (
    <Card
      title="Install the widget"
      description="Add this where the cancel button should appear. Your server signs a short-lived token for the logged-in customer; the widget never receives a secret."
      actions={
        <Button size="sm" onClick={copy} aria-live="polite">
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      }
    >
      <pre className="overflow-x-auto rounded-lg border border-line bg-canvas p-4 font-mono text-[0.8125rem] leading-relaxed text-ink-2"><code>{SNIPPET}</code></pre>
      <ul className="mt-4 space-y-1.5 text-xs text-muted">
        <li><code className="font-mono text-ink-2">data-token</code>: a signed JWT for this customer. Required.</li>
        <li><code className="font-mono text-ink-2">data-mount</code>: CSS selector for the button location. Optional.</li>
        <li><code className="font-mono text-ink-2">data-label</code>: button text. Optional.</li>
      </ul>
    </Card>
  );
}

function DemoControlsCard({ controls }: { controls: DemoControls }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const toggle = useMutation({
    mutationFn: (next: DemoControls) => dashboardApi.setDemoControls(next),
    onSuccess: (next) => {
      queryClient.setQueryData(keys.demo(), next);
      toast.notify('success', next.simulateStripeFailure ? 'Stripe failure simulated. Cancellations will not be confirmed.' : 'Stripe simulation back to normal.');
    },
    onError: () => toast.notify('error', 'Could not change the demo switch.'),
  });
  const reset = useMutation({
    mutationFn: () => dashboardApi.resetDemoData(),
    onSuccess: async () => {
      setConfirmReset(false);
      await queryClient.invalidateQueries({ queryKey: keys.all });
      toast.notify('success', 'Demo data reset to the seeded state.');
    },
    onError: () => toast.notify('error', 'Reset failed. Try again.'),
  });

  return (
    <section id="demo" className="mt-8 scroll-mt-8">
      <Card title="Demo controls" description="Available only in the demo environment. Not part of the production product." actions={<FlaskConical className="size-4 text-warn" aria-hidden="true" />}>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-ink">Simulate a Stripe update that does not apply</p>
            <p className="mt-1 text-sm text-muted">
              While on, the widget’s cancel request is sent but Stripe still shows the subscription as active. The read-back fails, the customer sees “not confirmed”, and an alert opens.
            </p>
          </div>
          <Toggle label="Simulate a Stripe update that does not apply" checked={controls.simulateStripeFailure} disabled={toggle.isPending}
            onChange={(v) => toggle.mutate({ ...controls, simulateStripeFailure: v })} />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          <div>
            <p className="text-sm font-medium text-ink">Reset demo data</p>
            <p className="mt-1 text-sm text-muted">Restores the seeded accounts, cancellations, and alerts. Your demo sign-in is kept.</p>
          </div>
          {confirmReset ? (
            <div className="flex gap-2">
              <Button variant="danger" busy={reset.isPending} onClick={() => reset.mutate()}>
                <RotateCcw className="size-4" aria-hidden="true" />
                Yes, reset
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>Keep data</Button>
            </div>
          ) : (
            <Button onClick={() => setConfirmReset(true)}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset demo data
            </Button>
          )}
        </div>
      </Card>
    </section>
  );
}

