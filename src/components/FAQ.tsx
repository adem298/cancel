import { FAQ as FAQ_ITEMS } from '../lib/site';
import { Section } from './Section';

export function FAQ() {
  return (
    <Section id="faq" eyebrow="FAQ" title="Questions people ask first.">
      <div className="panel divide-y divide-line">
        {FAQ_ITEMS.map((item) => (
          <details key={item.question} className="group px-6 py-5">
            <summary className="flex cursor-pointer items-center justify-between gap-6 text-left text-base font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
              {item.question}
              <span aria-hidden="true" className="font-mono text-faint transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
