import { ArrowRight, BadgeCheck, CircleCheck, Lock, ShieldCheck, Webhook } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import { BRAND } from '../lib/site';

const INSTALL_SNIPPET = `<!-- Drop this where your billing page renders -->
<script
  src="https://cdn.${BRAND.domain}/v1/widget.js"
  data-token="SIGNED_CUSTOMER_TOKEN"
  data-theme="#34d399"
  async
></script>`;

const TRUST_POINTS = [
  { icon: Lock, label: 'Card data stays with Stripe' },
  { icon: ShieldCheck, label: 'Restricted, least-privilege access' },
  { icon: Webhook, label: 'Signed, idempotent webhooks' },
] as const;

export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-heading" className="relative isolate overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10" />
      <div aria-hidden="true" className="glow-accent absolute top-0 left-1/2 -z-10 h-[34rem] w-[64rem] -translate-x-1/2 -translate-y-1/3 opacity-70" />

      <div className="mx-auto grid w-full max-w-(--container-page) grid-cols-1 items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        <div className="reveal min-w-0">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/80 px-3 py-1 text-xs font-medium text-ink-2">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            {BRAND.status}
          </p>

          <h1 id="hero-heading" className="text-4xl font-semibold tracking-[-0.03em] text-ink sm:text-5xl lg:text-[4.25rem] lg:leading-[1.02]">
            Cancellations that <span className="text-accent">actually stop billing.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            {BRAND.name} replaces the cancel button in your app. It offers a save step when it fits, cancels the
            subscription in Stripe, and checks that Stripe really reflects the change. If billing did not stop, you
            hear about it before the next invoice, not from a chargeback.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#audit" className="btn-primary px-5 py-3">
              Request a free cancellation audit
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
            <a href="#demo" className="btn-secondary px-5 py-3">
              Try the live demo
            </a>
          </div>

          <ul className="mt-10 flex flex-col gap-3 text-sm text-muted sm:flex-row sm:flex-wrap sm:gap-x-6">
            {TRUST_POINTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="size-4 text-accent" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="reveal relative min-w-0" style={{ animationDelay: '120ms' }}>
          <div className="space-y-4">
            <CodeBlock code={INSTALL_SNIPPET} language="html" filename="billing.html" />

            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-muted">Billing check · sub_1Q8fK2…</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                  <BadgeCheck className="size-3.5" aria-hidden="true" />
                  Verified
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 font-mono text-[0.8rem]">
                <dt className="text-faint">status</dt>
                <dd className="text-ink-2">active</dd>
                <dt className="text-faint">cancel_at_period_end</dt>
                <dd className="text-accent">true</dd>
                <dt className="text-faint">cancel_at</dt>
                <dd className="text-ink-2">Nov 15, 2026</dd>
              </dl>

              <div className="mt-5 flex items-start gap-3 rounded-lg border border-accent/20 bg-accent-soft p-3.5">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                <p className="text-sm text-ink-2">
                  Stripe confirms the subscription is scheduled to end. The customer received the exact end date by
                  email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
