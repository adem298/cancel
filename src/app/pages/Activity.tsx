import { useState } from 'react';
import { Link } from 'react-router';
import { formatDateTime } from '../../shared/format';
import type { AuditEventType } from '../../shared/types';
import { Badge, Card, EmptyState, ErrorState, LoadingBlock, Pagination, PageHeader, inputClass, useDocumentTitle } from '../ui';
import { ACTOR_META, ALL_EVENT_TYPES, EVENT_LABELS } from '../lib/labels';
import { useActivity } from '../lib/api';

const PAGE_SIZE = 15;

export function ActivityPage() {
  useDocumentTitle('Activity');
  const [type, setType] = useState<AuditEventType | 'all'>('all');
  const [page, setPage] = useState(1);
  const activity = useActivity({ type, page, pageSize: PAGE_SIZE });

  return (
    <>
      <PageHeader
        title="Activity"
        description="An append-only log of every cancel step, Stripe call, read-back, alert, and settings change."
        actions={
          <>
            <label htmlFor="activity-type" className="sr-only">Event type</label>
            <select
              id="activity-type"
              className={`${inputClass} w-auto min-w-[200px]`}
              value={type}
              onChange={(e) => {
                setType(e.target.value as AuditEventType | 'all');
                setPage(1);
              }}
            >
              <option value="all">All events</option>
              {ALL_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{EVENT_LABELS[t]}</option>
              ))}
            </select>
          </>
        }
      />

      <Card padded={false}>
        {activity.isError ? (
          <ErrorState message="Activity could not be loaded." onRetry={() => activity.refetch()} />
        ) : !activity.data ? (
          <LoadingBlock label="Loading activity" />
        ) : activity.data.items.length === 0 ? (
          <EmptyState title="No events for this filter" body="Choose another event type or wait for new activity." />
        ) : (
          <div aria-busy={activity.isFetching || undefined} className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Activity log</caption>
              <thead>
                <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                  <th scope="col" className="px-5 py-3 font-medium">Time</th>
                  <th scope="col" className="px-3 py-3 font-medium">Event</th>
                  <th scope="col" className="px-3 py-3 font-medium">Actor</th>
                  <th scope="col" className="px-3 py-3 font-medium">Details</th>
                  <th scope="col" className="px-5 py-3 font-medium">Cancellation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {activity.data.items.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-2/60">
                    <td className="px-5 py-3 font-mono text-xs whitespace-nowrap text-muted">
                      <time dateTime={e.at}>{formatDateTime(e.at)}</time>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-ink">{EVENT_LABELS[e.type]}</td>
                    <td className="px-3 py-3"><Badge tone={ACTOR_META[e.actor].tone}>{ACTOR_META[e.actor].label}</Badge></td>
                    <td className="px-3 py-3 text-ink-2">{e.summary}</td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {e.cancellationId ? (
                        <Link to={`/app/cancellations/${e.cancellationId}`} className="text-accent hover:underline">
                          {e.cancellationId}
                        </Link>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activity.data && activity.data.total > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={activity.data.total} onPage={setPage} />
        )}
      </Card>
    </>
  );
}
