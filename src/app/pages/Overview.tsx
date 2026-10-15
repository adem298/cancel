import { useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { formatPercent, formatUsd, formatInt } from '../../shared/format';
import { REASON_LABELS } from '../../shared/catalog';
import type { RangeKey } from '../../shared/types';
import { Badge, Card, EmptyState, ErrorState, InlineAlert, LoadingBlock, PageHeader, Stat, useDocumentTitle } from '../ui';
import { CancelChart } from '../components/CancelChart';
import { CancellationTable } from '../components/CancellationTable';
import { dashboardApi, useOverview } from '../lib/api';

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
];

export function OverviewPage() {
  useDocumentTitle('Overview');
  const [range, setRange] = useState<RangeKey>('30d');
  const overview = useOverview(range);
  const isDemo = dashboardApi.mode === 'demo';

  return (
    <>
      <PageHeader
        eyebrow={isDemo ? <Badge tone="warning">Sample data</Badge> : undefined}
        title="Overview"
        description="Cancellation requests, offers that saved a customer, and whether Stripe confirmed each change."
        actions={
          <div role="group" aria-label="Date range" className="inline-flex rounded-lg border border-line-strong bg-surface p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                aria-pressed={range === r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  range === r.key ? 'bg-surface-3 text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {overview.isError ? (
        <ErrorState message="Overview could not be loaded." onRetry={() => overview.refetch()} />
      ) : !overview.data ? (
        <div className="panel"><LoadingBlock label="Loading overview" /></div>
      ) : (
        <div className="space-y-6" aria-busy={overview.isFetching || undefined}>
          {overview.data.totals.openAlerts > 0 && (
            <InlineAlert tone="warning">
              <span className="flex flex-wrap items-center gap-3">
                <AlertTriangle className="size-4 text-warn" aria-hidden="true" />
                <span className="flex-1">
                  {overview.data.totals.openAlerts} cancellation{overview.data.totals.openAlerts === 1 ? ' was' : 's were'} requested by a customer but not confirmed by Stripe.
                </span>
                <Link to="/app/alerts" className="inline-flex items-center gap-1 font-medium text-warn hover:underline">
                  Review alerts <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </span>
            </InlineAlert>
          )}

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
            <Stat label="Cancellation requests" value={formatInt(overview.data.totals.cancellations)} hint={`Last ${range.replace('d', ' days')}`} />
            <Stat
              label="Saved by offers"
              value={formatInt(overview.data.totals.saved)}
              hint={`${formatPercent(overview.data.totals.saveRate)} save rate`}
            />
            <Stat label="MRR kept" value={`${formatUsd(overview.data.totals.mrrKeptUsd)}/mo`} hint="From accepted offers and pauses" />
            <Stat
              label="Confirmed by Stripe"
              value={formatPercent(overview.data.totals.verifiedRate)}
              hint={overview.data.totals.openAlerts > 0 ? `${overview.data.totals.openAlerts} open alert${overview.data.totals.openAlerts === 1 ? '' : 's'}` : 'No open alerts'}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <Card title="Requests and saves" description="Daily, UTC">
              {overview.data.totals.cancellations === 0 ? (
                <EmptyState title="No cancellation requests yet" body="Requests appear here as soon as a customer uses the cancel flow." />
              ) : (
                <CancelChart series={overview.data.series} />
              )}
            </Card>

            <Card title="Why customers leave" description="Share of requests with a stated reason">
              {overview.data.reasons.length === 0 ? (
                <p className="text-sm text-muted">No reasons recorded in this range.</p>
              ) : (
                <ul className="space-y-4">
                  {overview.data.reasons.map((r) => (
                    <li key={r.reason}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="text-ink-2">{REASON_LABELS[r.reason]}</span>
                        <span className="text-muted tabular-nums">
                          {formatInt(r.count)} · {formatPercent(r.share)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                        <div className="h-full rounded-full bg-accent/80" style={{ width: `${Math.round(r.share * 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Recent cancellations" padded={false}>
            {overview.data.recent.length === 0 ? (
              <EmptyState title="Nothing here yet" body="Recent requests will be listed in this table." />
            ) : (
              <>
                <CancellationTable rows={overview.data.recent} caption="Most recent cancellation requests" />
                <div className="border-t border-line px-5 py-3 text-right">
                  <Link to="/app/cancellations" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
                    View all cancellations <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
