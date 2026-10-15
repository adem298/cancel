/**
 * Site-wide configuration and copy.
 *
 * Everything customer-facing that is likely to change (brand name, contact
 * address, prices, FAQ) lives here so it can be reviewed in one place.
 */

export const BRAND = {
  name: 'Stopbill',
  tagline: 'Cancellations that actually stop billing.',
  domain: 'stopbill.dev',
  contactEmail: 'hello@stopbill.dev',
  status: 'Now accepting early-access teams',
} as const;

export const NAV_LINKS = [
  { href: '#problem', label: 'Why it matters' },
  { href: '#demo', label: 'Live demo' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#security', label: 'Security' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
] as const;

export type Plan = {
  name: string;
  price: number;
  cadence: string;
  description: string;
  subscriptions: string;
  features: readonly string[];
  highlighted?: boolean;
};

export const PLANS: readonly Plan[] = [
  {
    name: 'Starter',
    price: 29,
    cadence: '/ month',
    description: 'For early-stage SaaS products getting their first paying customers.',
    subscriptions: 'Up to 500 active subscriptions',
    features: [
      'Embeddable cancel widget',
      'Reason survey and save offers',
      'Real cancellation via Stripe',
      'Billing verification and owner alerts',
      'Confirmation emails',
      'Dashboard with core metrics',
    ],
  },
  {
    name: 'Growth',
    price: 79,
    cadence: '/ month',
    description: 'For growing products that need reliable retention metrics and full audit history.',
    subscriptions: 'Up to 2,500 active subscriptions',
    features: [
      'Everything in Starter',
      'Full audit log export',
      'Recovered revenue reporting',
      'Brand-matched widget theme',
      'Webhook monitoring and retries',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    name: 'Scale',
    price: 199,
    cadence: '/ month',
    description: 'For high-volume subscription businesses with several teams and products.',
    subscriptions: 'Up to 10,000 active subscriptions',
    features: [
      'Everything in Growth',
      'Multiple products and domains',
      'Hosted cancel page on your subdomain',
      'Team access and roles',
      'Dedicated onboarding call',
    ],
  },
] as const;

export const SETUP_SERVICE = {
  name: 'Done-for-you setup',
  price: 500,
  monthly: 29,
  description:
    'We install, configure, and test the cancel flow with your Stripe account, then hand it over with a short walkthrough.',
  includes: [
    'Stripe connection with restricted, least-privilege access',
    'Widget installed and styled to your brand colors',
    'Save offers configured for your plans',
    'End-to-end test cancellations in Stripe test mode',
  ],
} as const;

export type FaqItem = { question: string; answer: string };

export const FAQ: readonly FaqItem[] = [
  {
    question: 'Does Stopbill hold or process card details?',
    answer:
      'No. Card data stays with Stripe. Stopbill works with subscription objects and their IDs, so card numbers never reach our servers.',
  },
  {
    question: 'What access do you need from Stripe?',
    answer:
      'Stripe Connect OAuth or a restricted API key with only the permissions the flow needs: read and update subscriptions, read customers and invoices, and manage coupons for save offers. We never ask for a full secret key.',
  },
  {
    question: 'What happens if a cancellation fails in Stripe?',
    answer:
      'The customer sees a clear message and is not told they are cancelled. The owner is alerted, and the attempt is written to the audit log. Stopbill also compares its records against Stripe through webhooks and the API, so a mismatch is caught and flagged.',
  },
  {
    question: 'How does the cancel flow know who is cancelling?',
    answer:
      'Your app passes a short-lived, signed token, such as a JWT, that identifies the customer and subscription. Stopbill never sees your customers’ passwords, and the token cannot be used to cancel a different subscription.',
  },
  {
    question: 'Can customers cancel now or at the end of the billing period?',
    answer:
      'Both. The customer chooses. The screen shows the exact date their access ends and whether a final charge applies, before they confirm.',
  },
  {
    question: 'Is this compliant with cancellation laws?',
    answer:
      'The flow is designed around easy-cancellation principles: a visible cancel button, a short flow, a “No thanks, cancel” option at every step, and an immediate confirmation. This is not legal advice. Requirements differ by market and change over time, so have your counsel review the flow for your markets.',
  },
  {
    question: 'Do you support Paddle, Lemon Squeezy, or PayPal?',
    answer:
      'Not yet. Stopbill is Stripe-only at launch so we can make the billing checks reliable first. Paddle and Lemon Squeezy are on the roadmap.',
  },
  {
    question: 'Does it replace the Stripe Customer Portal?',
    answer:
      'It can sit alongside it. The Customer Portal lets customers cancel. Stopbill adds the save step, the reason survey, the billing check that confirms the cancellation took effect, and the dashboard that shows what you are retaining.',
  },
  {
    question: 'How do you handle my customers’ data?',
    answer:
      'Each business is isolated in its own data scope. Tokens and keys are encrypted at rest, every action is logged, and we process customer data on your behalf under a data processing agreement.',
  },
] as const;

export const ROADMAP = [
  { label: 'Stripe', status: 'Available', tone: 'live' },
  { label: 'Paddle', status: 'Planned', tone: 'next' },
  { label: 'Lemon Squeezy', status: 'Planned', tone: 'next' },
  { label: 'Win-back emails', status: 'Planned', tone: 'next' },
  { label: 'Offer A/B testing', status: 'Planned', tone: 'next' },
  { label: 'Analytics and support integrations', status: 'Later', tone: 'later' },
] as const;
