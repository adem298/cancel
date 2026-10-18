import { CHANNEL_CARDS } from '../lib/site';
import { Section } from './Section';

export function Channels() {
  return (
    <Section
      id="channels"
      eyebrow="Billing channels"
      title="Cancel where you pay."
      description="A subscription can only be cancelled in the place that bills it. The extension asks first, so it shows the right steps."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {CHANNEL_CARDS.map((card) => (
          <article key={card.title} className="panel flex flex-col p-6">
            <h3 className="text-base font-semibold text-ink">{card.title}</h3>
            <p className="mt-3 font-mono text-[0.8125rem] leading-relaxed text-ink-2">{card.where}</p>
            <p className="mt-auto pt-6 text-sm text-muted">{card.note}</p>
          </article>
        ))}
      </div>
      <div className="panel mt-4 p-6">
        <h3 className="text-base font-semibold text-ink">Not sure which one?</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Check your bank or card statement. A charge labelled “OpenAI” or “chatgpt.com” is web billing. “Apple” means the iPhone or
          iPad app. “Google” means Google Play.
        </p>
      </div>
    </Section>
  );
}
