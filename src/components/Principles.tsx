import { CircleCheck, Info } from 'lucide-react';
import { Section } from './Section';

const PRINCIPLES = [
  'The cancel option is visible on the billing page. It is not hidden behind a support form.',
  'The flow takes two to three clicks from billing to confirmation.',
  '“No thanks, cancel” is available on every step, including the offer.',
  'The exact end date and any final charge are shown before the customer confirms.',
  'The confirmation email is sent immediately after Stripe confirms the change.',
  'Save offers appear only when they fit the stated reason.',
] as const;

export function Principles() {
  return (
    <Section
      id="principles"
      eyebrow="Fair cancellation"
      title="Built around clear, easy cancellation."
      description="Several regions have tightened, or are tightening, rules on easy cancellation. A clear flow is good for trust either way, so Stopbill is built to make cancelling quick and unambiguous."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
        <ul className="grid gap-4">
          {PRINCIPLES.map((p) => (
            <li key={p} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
              <span className="text-[0.9375rem] leading-relaxed text-ink-2">{p}</span>
            </li>
          ))}
        </ul>

        <aside className="panel flex h-fit flex-col gap-5 p-7">
          <div className="flex items-center gap-2.5 text-ink">
            <Info className="size-5 text-accent" aria-hidden="true" />
            <h3 className="font-semibold">A note on compliance</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Stopbill helps you build a clear cancellation flow. It does not, on its own, make your business compliant
            with any law. Cancellation rules differ by country and state, and they change over time.
          </p>
          <p className="text-sm leading-relaxed text-muted">
            Before you rely on the flow in a given market, have your counsel review your cancellation terms and the
            flow itself.
          </p>
        </aside>
      </div>
    </Section>
  );
}
