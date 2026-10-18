import { STEPS } from '../lib/site';
import { Section } from './Section';

export function Steps() {
  return (
    <Section
      id="steps"
      eyebrow="How it works"
      title="Four steps, each one checked off by you."
      description="Stopbill keeps track of where you are. It does not do the cancelling."
    >
      <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.title} className="panel p-6">
            <span className="font-mono text-xs text-accent">0{index + 1}</span>
            <h3 className="mt-3 text-base font-semibold text-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
