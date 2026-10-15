import { Check, ShieldCheck } from 'lucide-react';
import { Section } from './Section';
import { PLANS, SETUP_SERVICE } from '../lib/site';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function Pricing() {
  return (
    <Section
      id="pricing"
      eyebrow="Pricing"
      title="Flat monthly pricing. No revenue share."
      description="Pay for the plan, keep the revenue. Plans are priced by the number of active subscriptions in your Stripe account. Stripe-only at launch."
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <article
            key={plan.name}
            className={`relative flex flex-col rounded-2xl border p-7 ${
              plan.highlighted ? 'border-accent/50 bg-surface shadow-[0_0_0_1px_rgb(52_211_153/0.15),0_24px_48px_-24px_rgb(52_211_153/0.25)]' : 'border-line bg-surface'
            }`}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 font-mono text-[0.68rem] font-semibold tracking-wider text-canvas uppercase">
                Recommended
              </span>
            )}
            <h3 className="text-lg font-semibold text-ink">{plan.name}</h3>
            <p className="mt-2 min-h-[3rem] text-sm leading-relaxed text-muted">{plan.description}</p>
            <p className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight text-ink tabular-nums">{money.format(plan.price)}</span>
              <span className="text-sm text-muted">{plan.cadence}</span>
            </p>
            <p className="mt-1 text-sm text-muted">{plan.subscriptions}</p>

            <a
              href="#audit"
              className={`mt-7 w-full ${plan.highlighted ? 'btn-primary' : 'btn-secondary'}`}
            >
              Get started
            </a>

            <ul className="mt-7 space-y-3 border-t border-line pt-7 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2.5 text-ink-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 rounded-2xl border border-line bg-surface p-7 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-10">
        <div>
          <p className="eyebrow">Optional</p>
          <h3 className="mt-2 text-xl font-semibold text-ink">{SETUP_SERVICE.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{SETUP_SERVICE.description}</p>
          <p className="mt-5 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-ink tabular-nums">{money.format(SETUP_SERVICE.price)}</span>
            <span className="text-sm text-muted">one-time setup, then {money.format(SETUP_SERVICE.monthly)} / month</span>
          </p>
        </div>
        <div className="flex flex-col gap-5">
          <ul className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {SETUP_SERVICE.includes.map((item) => (
              <li key={item} className="flex gap-2.5 text-ink-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <div>
            <a href="#audit" className="btn-secondary px-5 py-2.5">
              Ask about setup
            </a>
          </div>
        </div>
      </div>
    </Section>
  );
}
