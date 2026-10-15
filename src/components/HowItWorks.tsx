import { Section } from './Section';
import { CodeBlock } from './CodeBlock';

const STEPS = [
  {
    title: 'Add the widget',
    body: 'Drop in one script tag, or use the React component. Your backend issues a short-lived signed token that identifies the customer and subscription.',
  },
  {
    title: 'Connect Stripe with limited access',
    body: 'Authorize through Stripe Connect OAuth or a restricted API key. Only the permissions the flow needs are granted. We never ask for a full secret key.',
  },
  {
    title: 'The customer cancels in two or three clicks',
    body: 'They give a reason, see an offer if one fits, and choose when access ends. Every step has a clear “No thanks, cancel”.',
  },
  {
    title: 'Stopbill verifies and keeps records in sync',
    body: 'The subscription is read back from Stripe. Webhooks update your records. If billing did not stop, you are alerted and the attempt is logged.',
  },
] as const;

const TOKEN_SNIPPET = `import jwt from 'jsonwebtoken';

// Your backend, on the billing page. Runs only for the logged-in customer.
export function stopbillToken(customerId: string, subscriptionId: string) {
  return jwt.sign(
    { sub: customerId, subscription: subscriptionId },
    process.env.STOPBILL_SIGNING_SECRET!,
    { algorithm: 'HS256', audience: 'stopbill', expiresIn: '5m' },
  );
}`;

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      eyebrow="How it works"
      title="Integration in an afternoon, not a billing rewrite."
      description="Stopbill sits between your billing page and Stripe. Your product, your pricing, and your card data stay where they are."
    >
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <ol className="relative space-y-8">
          <span aria-hidden="true" className="absolute top-3 bottom-3 left-[15px] w-px bg-line" />
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-5">
              <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full border border-line-strong bg-canvas font-mono text-xs font-medium text-accent">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="pt-0.5">
                <h3 className="font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="space-y-4 lg:pt-2">
          <CodeBlock code={TOKEN_SNIPPET} language="ts" filename="server/stopbill-token.ts" />
          <p className="text-sm leading-relaxed text-muted">
            The token expires in five minutes and is scoped to one subscription. A customer cannot use it to cancel
            someone else’s plan.
          </p>
        </div>
      </div>
    </Section>
  );
}
