import { CreditCard, Database, Fingerprint, Gauge, KeyRound, Lock, ScrollText, Webhook } from 'lucide-react';
import { Section } from './Section';

const CONTROLS = [
  {
    icon: KeyRound,
    title: 'Least-privilege Stripe access',
    body: 'Stripe Connect OAuth or a restricted key limited to subscriptions, customers, invoices, and coupons. Full secret keys are never requested.',
  },
  {
    icon: Lock,
    title: 'Encrypted secrets',
    body: 'Stripe credentials and signing secrets are encrypted at rest and never returned by the API after they are stored.',
  },
  {
    icon: Database,
    title: 'Isolated data per business',
    body: 'Each business has its own data scope. Queries are scoped to the tenant, and cross-tenant access is blocked by design.',
  },
  {
    icon: Fingerprint,
    title: 'Signed customer identity',
    body: 'Short-lived, audience-bound tokens identify who is cancelling. Stopbill never sees your customers’ passwords.',
  },
  {
    icon: Webhook,
    title: 'Verified, idempotent webhooks',
    body: 'Every Stripe webhook signature is checked before it is processed. Repeated events are handled once.',
  },
  {
    icon: Gauge,
    title: 'Rate limits and abuse controls',
    body: 'Endpoints are rate-limited. Repeated failed attempts are blocked, which makes it harder to cancel someone else’s plan.',
  },
  {
    icon: ScrollText,
    title: 'Complete audit log',
    body: 'Every action is recorded with the actor, the time, and the change made in Stripe. Use it to answer disputes and support questions.',
  },
  {
    icon: CreditCard,
    title: 'No card data on our systems',
    body: 'Card numbers are entered into and stored by Stripe. Stopbill works with subscription IDs and status, which keeps us out of heavy PCI scope.',
  },
] as const;

export function Security() {
  return (
    <Section
      id="security"
      eyebrow="Security"
      title="Designed for the part of your business that handles money."
      description="A cancel flow sits next to billing, so it is held to a higher standard. These are the controls we build in from the start."
    >
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CONTROLS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="panel p-6">
            <span className="mb-4 grid size-9 place-items-center rounded-lg border border-line-strong bg-canvas text-accent">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <h3 className="font-semibold text-ink">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
