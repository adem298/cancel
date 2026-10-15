import { useId, useState, type FormEvent } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { BRAND } from '../lib/site';

const SIZE_OPTIONS = [
  { value: 'under-500', label: 'Under 500' },
  { value: '500-2500', label: '500 to 2,500' },
  { value: '2500-10000', label: '2,500 to 10,000' },
  { value: 'over-10000', label: 'More than 10,000' },
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Audit request. There is no backend yet, so submitting opens the visitor's
 * email client with the details filled in. Nothing is stored on this site.
 */
export function AuditCTA() {
  const formId = useId();
  const [email, setEmail] = useState('');
  const [site, setSite] = useState('');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]['value']>('under-500');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid work email address.');
      return;
    }
    setError(null);
    const sizeLabel = SIZE_OPTIONS.find((o) => o.value === size)?.label ?? size;
    const body = [
      'Hi,',
      '',
      'I would like a free cancellation audit for my Stripe subscriptions.',
      '',
      `Work email: ${email.trim()}`,
      `Website: ${site.trim() || 'not provided'}`,
      `Active subscriptions: ${sizeLabel}`,
    ].join('\n');
    const href = `mailto:${BRAND.contactEmail}?subject=${encodeURIComponent('Free cancellation audit request')}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  };

  const fieldClass =
    'w-full rounded-lg border border-line-strong bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 aria-[invalid=true]:border-danger';

  return (
    <section id="audit" aria-labelledby="audit-heading" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-(--container-page) px-5 sm:px-8">
        <div className="panel relative overflow-hidden p-8 sm:p-12">
          <div aria-hidden="true" className="glow-accent pointer-events-none absolute -top-40 -right-40 size-[28rem] opacity-60" />

          <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
            <div>
              <p className="eyebrow mb-3">Free audit</p>
              <h2 id="audit-heading" className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Find out whether your cancel button is really stopping billing.
              </h2>
              <p className="mt-4 text-muted leading-relaxed">
                We review how your cancellations are handled today, using a read-only Stripe key. You get a short
                written report with the issues we found and what to fix first. No commitment.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-ink-2">
                <li className="flex gap-2.5">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                  Read-only access. We never change your subscriptions.
                </li>
                <li className="flex gap-2.5">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                  You can revoke access at any time from your Stripe dashboard.
                </li>
              </ul>
            </div>

            <form id={formId} onSubmit={onSubmit} noValidate className="grid gap-4 self-start" aria-describedby={error ? `${formId}-error` : undefined}>
              <div>
                <label htmlFor={`${formId}-email`} className="mb-1.5 block text-sm font-medium text-ink-2">
                  Work email <span className="text-accent" aria-hidden="true">*</span>
                </label>
                <input
                  id={`${formId}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor={`${formId}-site`} className="mb-1.5 block text-sm font-medium text-ink-2">
                  Website <span className="text-faint">(optional)</span>
                </label>
                <input
                  id={`${formId}-site`}
                  name="website"
                  type="url"
                  autoComplete="url"
                  placeholder="https://yourproduct.com"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor={`${formId}-size`} className="mb-1.5 block text-sm font-medium text-ink-2">
                  Active subscriptions
                </label>
                <select
                  id={`${formId}-size`}
                  name="size"
                  value={size}
                  onChange={(e) => setSize(e.target.value as (typeof SIZE_OPTIONS)[number]['value'])}
                  className={`${fieldClass} appearance-none`}
                >
                  {SIZE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p id={`${formId}-error`} role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}

              <button type="submit" className="btn-primary mt-2 w-full py-3">
                Request my free audit
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
              <p className="text-xs leading-relaxed text-faint">
                Submitting opens your email app with this request addressed to {BRAND.contactEmail}. We use your
                details only to reply to you.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
