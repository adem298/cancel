import { Link } from 'react-router';
import { formatDateTime, formatRelative, formatUsd } from '../../shared/format';
import { getPlan, REASON_LABELS, TIMING_LABELS } from '../../shared/catalog';
import type { CancellationRecord } from '../../shared/types';
import { OutcomeBadge } from '../lib/labels';

export function CancellationTable({ rows, caption }: { rows: CancellationRecord[]; caption: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
            <th scope="col" className="px-5 py-3 font-medium">Customer</th>
            <th scope="col" className="px-3 py-3 font-medium">Plan</th>
            <th scope="col" className="px-3 py-3 font-medium">Reason</th>
            <th scope="col" className="px-3 py-3 font-medium">Timing</th>
            <th scope="col" className="px-3 py-3 font-medium">Outcome</th>
            <th scope="col" className="px-5 py-3 text-right font-medium">Requested</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id} className="transition-colors hover:bg-surface-2/60">
              <td className="px-5 py-3.5">
                <Link to={`/app/cancellations/${r.id}`} className="font-mono text-[0.8125rem] text-ink hover:text-accent">
                  {r.customerEmail}
                </Link>
                <div className="mt-0.5 font-mono text-[11px] text-faint">{r.subscriptionId}</div>
              </td>
              <td className="px-3 py-3.5 text-ink-2">{getPlan(r.planId).name}</td>
              <td className="px-3 py-3.5 text-ink-2">{r.reason ? REASON_LABELS[r.reason] : '—'}</td>
              <td className="px-3 py-3.5 whitespace-nowrap text-ink-2">{TIMING_LABELS[r.timing]}</td>
              <td className="px-3 py-3.5">
                <OutcomeBadge outcome={r.outcome} />
                {r.outcome === 'saved' && r.offerAccepted && (
                  <div className="mt-1 text-[11px] text-faint">{formatUsd(r.mrrKeptUsd)}/mo kept</div>
                )}
              </td>
              <td className="px-5 py-3.5 text-right whitespace-nowrap text-muted" title={formatDateTime(r.createdAt)}>
                {formatRelative(r.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
