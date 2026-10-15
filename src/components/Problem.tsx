import { Ban, CircleCheck, CreditCard, Mail, MousePointerClick, ShieldAlert, Undo2, Webhook } from 'lucide-react';
import { Section } from './Section';
import { CodeBlock } from './CodeBlock';

const BEFORE = [
  { icon: MousePointerClick, text: 'Customer clicks “Cancel”. The app marks the account as cancelled in its own database.' },
  { icon: Ban, text: 'Nothing is sent to Stripe. The subscription is still active.' },
  { icon: CreditCard, text: 'The next renewal is charged, and the customer does not expect it.' },
  { icon: Undo2, text: 'The customer disputes the charge with their bank.' },
  { icon: ShieldAlert, text: 'A chargeback, a dispute fee, and an angry support ticket.' },
] as const;

const AFTER = [
  { icon: MousePointerClick, text: 'Customer picks a reason. A save offer appears only if it fits that reason.' },
  { icon: Webhook, text: 'Cancellation goes to Stripe through the API, now or at period end, as the customer chooses.' },
  { icon: CircleCheck, text: 'Stopbill reads the subscription back from Stripe and confirms canceled or scheduled.' },
  { icon: Mail, text: 'The customer gets an email with the exact end date and what happens to their data.' },
  { icon: ShieldAlert, text: 'If the check fails, the owner is alerted. The customer is not told they are cancelled.' },
] as const;

const CHECK_SNIPPET = `import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY!);

// 1. Cancel in Stripe, at the time the customer chose.
await stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: true,
});

// 2. Read the state back. Don't trust the write alone.
const sub = await stripe.subscriptions.retrieve(subscriptionId);
const stopped =
  sub.status === 'canceled' ||
  sub.cancel_at_period_end === true ||
  sub.cancel_at !== null;

// 3. Billing did not stop: alert the owner.
if (!stopped) {
  await alertOwner({ subscriptionId, status: sub.status });
}`;

function Column({
  tone,
  title,
  subtitle,
  items,
}: {
  tone: 'danger' | 'accent';
  title: string;
  subtitle: string;
  items: readonly { icon: typeof Ban; text: string }[];
}) {
  const isDanger = tone === 'danger';
  return (
    <article className="panel flex flex-col p-6 sm:p-7">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className={`text-lg font-semibold ${isDanger ? 'text-danger' : 'text-accent'}`}>{title}</h3>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[0.7rem] font-medium uppercase tracking-wider ${
            isDanger ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent'
          }`}
        >
          {isDanger ? 'Common' : 'Stopbill'}
        </span>
      </header>
      <ol className="space-y-4">
        {items.map(({ icon: Icon, text }, i) => (
          <li key={text} className="flex gap-3.5">
            <span
              className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border ${
                isDanger ? 'border-danger/25 bg-danger-soft text-danger' : 'border-accent/25 bg-accent-soft text-accent'
              }`}
              aria-hidden="true"
            >
              <Icon className="size-3.5" />
            </span>
            <span className="text-[0.9375rem] leading-relaxed text-ink-2">
              <span className="sr-only">Step {i + 1}: </span>
              {text}
            </span>
          </li>
        ))}
      </ol>
    </article>
  );
}

export function Problem() {
  return (
    <Section
      id="problem"
      eyebrow="The problem"
      title="A cancel button can look finished while billing continues."
      description="Many apps update their own database and stop there. Stripe keeps the subscription, and the customer keeps getting charged. The fix is a real Stripe cancellation, followed by a read-back that confirms it."
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Column
          tone="danger"
          title="A typical cancel button"
          subtitle="Local flag only. Stripe is never updated."
          items={BEFORE}
        />
        <Column
          tone="accent"
          title="Stopbill’s verified flow"
          subtitle="Stripe is updated, then checked."
          items={AFTER}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.15fr] lg:items-start">
        <div className="pt-2">
          <h3 className="text-xl font-semibold text-ink">The check is a few lines of code</h3>
          <p className="mt-3 text-muted leading-relaxed">
            Stopbill runs this logic after every cancellation, plus on webhook events from Stripe. It uses the
            subscription status and the scheduled cancel fields that Stripe returns.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm leading-relaxed text-muted">
            <li className="flex gap-2.5">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              <span>
                Covers “cancel now” (status becomes <code className="font-mono text-ink-2">canceled</code>) and “cancel at
                period end” (<code className="font-mono text-ink-2">cancel_at_period_end</code>).
              </span>
            </li>
            <li className="flex gap-2.5">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              <span>Alerts the owner when neither condition holds, so mismatches are found in minutes, not in a dispute.</span>
            </li>
          </ul>
        </div>
        <CodeBlock code={CHECK_SNIPPET} language="ts" filename="verify-cancellation.ts" />
      </div>
    </Section>
  );
}
