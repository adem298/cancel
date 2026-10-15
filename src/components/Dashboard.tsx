import { Section } from './Section';

// Sample data for illustration only. It does not represent any customer.
const KPIS = [
  { label: 'Cancellations', value: '42', delta: 'last 30 days' },
  { label: 'Saved by offers', value: '9', delta: '21% of cancellation attempts' },
  { label: 'Recovered revenue', value: '$712', delta: 'from saved subscriptions' },
  { label: 'Billing checks passed', value: '42 / 42', delta: 'confirmed in Stripe' },
] as const;

const REASONS = [
  { label: 'It costs too much', pct: 38 },
  { label: 'Not using it enough', pct: 27 },
  { label: 'Missing a feature', pct: 15 },
  { label: 'Switching tool', pct: 12 },
  { label: 'Something else', pct: 8 },
] as const;

const ROWS = [
  { customer: 'cus_••••7A2C', reason: 'It costs too much', timing: 'Period end', result: 'Scheduled', when: '2h ago' },
  { customer: 'cus_••••D91E', reason: 'Not using it enough', timing: 'Offer accepted', result: 'Paused', when: '5h ago' },
  { customer: 'cus_••••2B0F', reason: 'Switching tool', timing: 'Now', result: 'Canceled', when: 'Yesterday' },
  { customer: 'cus_••••5C84', reason: 'Missing a feature', timing: 'Period end', result: 'Scheduled', when: 'Yesterday' },
] as const;

export function Dashboard() {
  return (
    <Section
      id="dashboard"
      eyebrow="Owner dashboard"
      title="See what is leaving, why, and what it cost you."
      description="Retention numbers you can trust, because each cancellation is tied to a verified Stripe state. Sample data shown."
    >
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-5 py-3">
          <p className="text-sm font-medium text-ink-2">Retention · Last 30 days</p>
          <span className="rounded-full border border-line-strong px-2.5 py-1 font-mono text-[0.7rem] text-muted uppercase tracking-wider">
            Sample data
          </span>
        </div>

        <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {KPIS.map((kpi) => (
            <div key={kpi.label} className="bg-surface p-5">
              <p className="text-sm text-muted">{kpi.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums">{kpi.value}</p>
              <p className="mt-1 text-xs text-faint">{kpi.delta}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[1fr_1.4fr]">
          <div className="bg-surface p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-ink">Why customers cancel</h3>
            <ul className="mt-5 space-y-4">
              {REASONS.map((r) => (
                <li key={r.label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-2">{r.label}</span>
                    <span className="font-mono text-muted tabular-nums">{r.pct}%</span>
                  </div>
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3"
                    role="meter"
                    aria-label={r.label}
                    aria-valuenow={r.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="h-full rounded-full bg-accent/80" style={{ width: `${r.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-surface p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-ink">Recent cancellations</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-faint">
                    <th scope="col" className="pb-2.5 font-medium">Customer</th>
                    <th scope="col" className="pb-2.5 font-medium">Reason</th>
                    <th scope="col" className="pb-2.5 font-medium">Timing</th>
                    <th scope="col" className="pb-2.5 font-medium">Billing check</th>
                    <th scope="col" className="pb-2.5 text-right font-medium">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ROWS.map((row) => (
                    <tr key={row.customer}>
                      <td className="py-3 font-mono text-xs text-ink-2">{row.customer}</td>
                      <td className="py-3 text-muted">{row.reason}</td>
                      <td className="py-3 text-muted">{row.timing}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                          {row.result}
                        </span>
                      </td>
                      <td className="py-3 text-right text-xs text-faint">{row.when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
