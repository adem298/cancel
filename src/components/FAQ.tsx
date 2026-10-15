import { ChevronDown } from 'lucide-react';
import { Section } from './Section';
import { FAQ as FAQ_ITEMS, ROADMAP } from '../lib/site';

const TONE: Record<(typeof ROADMAP)[number]['tone'], string> = {
  live: 'border-accent/30 bg-accent-soft text-accent',
  next: 'border-line-strong bg-surface-2 text-ink-2',
  later: 'border-line bg-canvas text-faint',
};

export function FAQ() {
  return (
    <Section id="faq" eyebrow="FAQ" title="Questions teams ask before they connect Stripe.">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div className="space-y-8">
          <div>
            <h3 className="text-sm font-semibold text-ink">Roadmap</h3>
            <ul className="mt-4 space-y-2.5">
              {ROADMAP.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-2.5">
                  <span className="text-sm text-ink-2">{item.label}</span>
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[0.68rem] tracking-wider uppercase ${TONE[item.tone]}`}>
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="divide-y divide-line border-y border-line">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-md text-left text-[0.9775rem] font-medium text-ink marker:content-none hover:text-accent [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 pr-10 text-[0.9375rem] leading-relaxed text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
