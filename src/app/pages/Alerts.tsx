import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BellRing, RefreshCw } from 'lucide-react';
import { ApiError, type Alert } from '../../shared/types';
import { formatDateTime, formatRelative } from '../../shared/format';
import { Badge, Button, Card, EmptyState, ErrorState, Field, LoadingBlock, PageHeader, inputClass, useDocumentTitle, useFieldId, useToast } from '../ui';
import { StatusBadge } from '../lib/labels';
import { dashboardApi, keys, useAlerts } from '../lib/api';

type Tab = 'open' | 'resolved' | 'all';
const TABS: { key: Tab; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' },
];

export function AlertsPage() {
  useDocumentTitle('Alerts');
  const [tab, setTab] = useState<Tab>('open');
  const alerts = useAlerts(tab);

  return (
    <>
      <PageHeader
        title="Alerts"
        description="A cancellation is flagged when a customer asked to cancel but Stripe does not show the change. Each alert lists the expected and actual state."
      />

      <div role="tablist" aria-label="Alert status" className="mb-5 inline-flex rounded-lg border border-line-strong bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3.5 py-1.5 text-sm transition-colors ${tab === t.key ? 'bg-surface-3 text-ink' : 'text-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {alerts.isError ? (
        <ErrorState message="Alerts could not be loaded." onRetry={() => alerts.refetch()} />
      ) : !alerts.data ? (
        <Card padded={false}><LoadingBlock label="Loading alerts" /></Card>
      ) : alerts.data.length === 0 ? (
        <Card>
          <EmptyState
            title={tab === 'open' ? 'No open alerts' : 'No alerts here'}
            body={tab === 'open' ? 'Every cancellation was confirmed by Stripe. This page fills in when a read-back does not match.' : 'Nothing matches this filter.'}
          />
        </Card>
      ) : (
        <ul className="space-y-4" aria-label="Alerts">
          {alerts.data.map((a) => (
            <AlertItem key={a.id} alert={a} />
          ))}
        </ul>
      )}
    </>
  );
}

function AlertItem({ alert }: { alert: Alert }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const noteId = useFieldId('alert-note');
  const isOpen = alert.status === 'open';

  const onError = (err: unknown) => toast.notify('error', err instanceof ApiError ? err.message : 'Something went wrong. Try again.');

  const recheck = useMutation({
    mutationFn: () => dashboardApi.reverifyCancellation(alert.cancellationId),
    onSuccess: async (d) => {
      await queryClient.invalidateQueries({ queryKey: keys.all });
      toast.notify('success', d.alert?.status === 'open' ? 'Still open. Stripe does not match yet.' : 'Stripe now confirms the cancellation. Alert closed.');
    },
    onError,
  });

  const resolve = useMutation({
    mutationFn: () => dashboardApi.resolveAlert(alert.id, note.trim()),
    onSuccess: async () => {
      setNote('');
      setNoteOpen(false);
      await queryClient.invalidateQueries({ queryKey: keys.all });
      toast.notify('success', 'Alert resolved.');
    },
    onError,
  });

  return (
    <li className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <BellRing className={`size-4 ${isOpen ? 'text-danger' : 'text-muted'}`} aria-hidden="true" />
            <Badge tone={isOpen ? 'danger' : 'success'}>{isOpen ? 'Open' : 'Resolved'}</Badge>
            <span className="font-mono text-xs text-faint">{alert.id}</span>
          </div>
          <h2 className="mt-3 text-base font-semibold text-ink">
            <span className="font-mono text-sm">{alert.subscriptionId}</span>
          </h2>
          <p className="mt-1 text-sm text-muted">
            Opened {formatDateTime(alert.createdAt)} ({formatRelative(alert.createdAt)})
          </p>
        </div>
        <Link to={`/app/cancellations/${alert.cancellationId}`} className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
          View cancellation <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <dl className="mt-5 grid gap-4 rounded-lg border border-line bg-canvas/50 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted">Expected</dt>
          <dd className="mt-1 text-ink-2">{alert.expectedState}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Stripe reports</dt>
          <dd className="mt-1"><StatusBadge status={alert.actualStatus} /></dd>
        </div>
      </dl>

      {alert.status === 'resolved' && alert.resolutionNote && (
        <p className="mt-4 text-sm text-ink-2">
          <span className="text-muted">Resolved {alert.resolvedAt ? formatRelative(alert.resolvedAt) : ''}:</span> {alert.resolutionNote}
        </p>
      )}

      {isOpen && (
        <div className="mt-5">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => recheck.mutate()} busy={recheck.isPending}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Re-check in Stripe
            </Button>
            <Button size="sm" variant="ghost" aria-expanded={noteOpen} onClick={() => setNoteOpen((v) => !v)}>
              Resolve with a note
            </Button>
          </div>
          {noteOpen && (
            <form
              className="mt-4 max-w-xl space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (note.trim().length >= 5) resolve.mutate();
              }}
            >
              <Field label="Resolution note" htmlFor={noteId} hint="For example “Canceled manually in Stripe”. At least 5 characters.">
                <textarea id={noteId} className={`${inputClass} min-h-20`} value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <Button type="submit" variant="primary" size="sm" busy={resolve.isPending} disabled={note.trim().length < 5}>
                Resolve alert
              </Button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}
