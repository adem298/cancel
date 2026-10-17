import { Check, X } from 'lucide-react';
import { DOES, DOES_NOT } from '../lib/site';
import { Section } from './Section';

export function Limits() {
  return (
    <Section
      id="limits"
      eyebrow="Limits"
      title="What Stopbill does, and what it does not."
      description="We would rather be specific than sound impressive. This is the full list of what the extension does."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-6">
          <h3 className="text-base font-semibold text-ink">It does</h3>
          <ul className="mt-5 grid gap-3">
            {DOES.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink-2">
                <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-6">
          <h3 className="text-base font-semibold text-ink">It does not</h3>
          <ul className="mt-5 grid gap-3">
            {DOES_NOT.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink-2">
                <X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
