import {
  CalendarClock,
  LayoutDashboard,
  ListChecks,
  Mail,
  Palette,
  ScrollText,
  ShieldCheck,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { Section } from './Section';

type Feature = { icon: LucideIcon; title: string; body: string };

const FEATURES: readonly Feature[] = [
  {
    icon: ListChecks,
    title: 'One-question reason survey',
    body: 'Ask “Why are you leaving?” with a short list of answers. The answer decides which save offer appears.',
  },
  {
    icon: Tag,
    title: 'Save offers that fit',
    body: 'Discounts for 1–3 months, pauses for 1–3 months, or a switch to a cheaper plan. Each offer is optional.',
  },
  {
    icon: CalendarClock,
    title: 'Cancel now or at period end',
    body: 'The customer chooses. Cancellation runs through the Stripe API, and the screen shows the exact end date first.',
  },
  {
    icon: Mail,
    title: 'Instant confirmation email',
    body: 'Sent as soon as the cancellation is verified. States the end date, any final charge, and what happens to the customer’s data.',
  },
  {
    icon: ShieldCheck,
    title: 'Billing check after every cancel',
    body: 'The subscription is read back from Stripe. If it is neither canceled nor scheduled to cancel, the owner is alerted at once.',
  },
  {
    icon: LayoutDashboard,
    title: 'Owner dashboard',
    body: 'Cancellations, reasons, save rate, and recovered revenue in one view, with the raw records one click away.',
  },
  {
    icon: Palette,
    title: 'Brand-matched widget',
    body: 'Set your brand colors and fonts. The widget matches your product, so customers don’t feel handed off to a third party.',
  },
  {
    icon: ScrollText,
    title: 'Audit log for every action',
    body: 'Who cancelled, when, through which channel, and what changed in Stripe. Useful for disputes and support.',
  },
];

export function Features() {
  return (
    <Section
      id="features"
      eyebrow="Features"
      title="Everything a cancel flow needs, and nothing it doesn’t."
      description="Stopbill covers the save step, the cancellation, the billing check, and the reporting. It does not try to be a full billing platform."
    >
      <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <li key={title} className="group bg-surface p-6 transition-colors hover:bg-surface-2">
            <span className="mb-5 grid size-9 place-items-center rounded-lg border border-line-strong bg-canvas text-accent transition-colors group-hover:border-accent/50">
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
