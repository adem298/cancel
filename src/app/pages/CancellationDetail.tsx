import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { formatDate, formatDateTime, formatRelative, formatUsd } from '../../shared/format';
import { getPlan, OFFER_LABELS, REASON_LABELS, TIMING_LABELS } from '../../shared/catalog';
import { ApiError, type CancellationDetail as Detail } from '../../shared/types';
import { Badge, Button, Card, ErrorState, Field, InlineAlert, LoadingBlock, PageHeader, Skeleton, inputClass, useDocumentTitle, useFieldId, useToast } from '../ui';
import { ACTOR_META, EVENT_LABELS, OUTCOME_META, OutcomeBadge, StatusBadge } from '../lib/labels';
import { dashboardApi, keys, useCancellation } from '../lib/api';

export function CancellationDetailPage() {
  const { id = '' } = useParams();
  const detail = useCancellation(id);
  useDocumentTitle(`Cancellation ${id}`);

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
        <Link to="/app/cancellations" className="inline-flex items-center gap-1.5 hover:text-ink">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Cancellations
        </Link>
      </nav>

      {detail.isError ? (
        detail.error instanceof ApiError && detail.error.status === 404 ? (
          <ErrorState message="This cancellation does not exist, or it was removed." />
        ) : (
          <ErrorState message="This cancellation could not be loaded." onRetry={() => detail.refetch()} />
        )
      ) : !detail.data ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <div className="panel"><LoadingBlock label="Loading cancellation" /></div>
        </div>
      ) : (
        <DetailBody id={id} data={detail.data} />
      )}
    </>
  );
}

function DetailBody({ id, data }: { id: string; data: Detail }) {
  const { record, subscription, events, alert } = data;
  const plan = getPlan(record.planId);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const noteId = useFieldId('resolve-note');

  const onError = (err: unknown) => toast.notify('error', err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
  const onDetail = (next: Detail) => {
    queryClient.setQueryData(keys.cancellation(id), next);
    void queryClient.invalidateQueries({ queryKey: keys.all });
  };

  const reverify = useMutation({
    mutationFn: () => dashboardApi.reverifyCancellation(id),
    onSuccess: (next) => {
      onDetail(next);
      toast.notify(
        'success',
        next.alert ? 'Re-checked. Stripe still does not match the expected state.' : 'Re-checked. Stripe confirms the cancellation.',
      );
    },
    onError,
  });

  const retry = useMutation({
    mutationFn: () => dashboardApi.retryCancellation(id),
    onSuccess: (next) => {
      onDetail(next);
      const stillOpen = next.record.outcome === 'unconfirmed';
      toast.notify(
        stillOpen ? 'error' : 'success',
        stillOpen ? 'Retried. Stripe still has not confirmed the change.' : 'Retried. Stripe confirms the change.',
      );
    },
    onError,
  });

  const resolve = useMutation({
    mutationFn: (alertId: string) => dashboardApi.resolveAlert(alertId, note.trim()),
    onSuccess: async () => {
      setNote('');
      setNoteOpen(false);
      await queryClient.invalidateQueries({ queryKey: keys.all });
      toast.notify('success', 'Alert resolved. The resolution note is in the activity log.');
    },
    onError,
  });

  const openAlert = alert?.status === 'open' ? alert : null;
  const canRetry = record.outcome === 'unconfirmed';
  const busy = reverify.isPending || retry.isPending;

  return (
    <>
      <PageHeader
        eyebrow={<span className="font-mono">{record.id}</span>}
        title={record.customerEmail}
        description={`Requested ${formatDateTime(record.createdAt)} (${formatRelative(record.createdAt)}) on ${plan.name} · ${TIMING_LABELS[record.timing]}`}
        actions={
          <>
            <OutcomeBadge outcome={record.outcome} />
            <Button onClick={() => reverify.mutate()} busy={reverify.isPending} disabled={retry.isPending}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Re-check in Stripe
            </Button>
          </>
        }
      />

      {openAlert && (
        <section aria-labelledby="alert-title" className="mb-6 rounded-xl border border-danger/40 bg-danger-soft p-5">
          <div className="flex flex-wrap items-start gap-4">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 id="alert-title" className="font-semibold text-ink">Stripe does not match the cancellation</h2>
              <p className="mt-1 text-sm text-ink-2">{openAlert.expectedState}</p>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted">Actual Stripe status</dt>
                  <dd className="mt-0.5"><StatusBadge status={openAlert.actualStatus} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Opened</dt>
                  <dd className="mt-0.5 text-ink-2">{formatDateTime(openAlert.createdAt)}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {canRetry && (
                  <Button variant="primary" size="sm" onClick={() => retry.mutate()} busy={retry.isPending} disabled={reverify.isPending}>
                    <RotateCcw className="size-4" aria-hidden="true" />
                    Retry cancellation
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => setNoteOpen((v) => !v)} aria-expanded={noteOpen}>
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Mark as resolved
                </Button>
              </div>
              {noteOpen && (
                <form
                  className="mt-4 max-w-xl space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (note.trim().length >= 5) resolve.mutate(openAlert.id);
                  }}
                >
                  <Field label="Resolution note" htmlFor={noteId} hint="Say what you did, for example “Cancelled manually in the Stripe dashboard”. At least 5 characters.">
                    <textarea id={noteId} className={`${inputClass} min-h-20`} value={note} onChange={(e) => setNote(e.target.value)} />
                  </Field>
                  <div className="flex gap-2">
                    <Button type="submit" variant="primary" size="sm" busy={resolve.isPending} disabled={note.trim().length < 5}>
                      Resolve alert
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setNoteOpen(false)}>Cancel</Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {alert?.status === 'resolved' && (
        <div className="mb-6">
          <InlineAlert tone="info">
            <span className="text-ink-2">
              Alert resolved {alert.resolvedAt ? formatRelative(alert.resolvedAt) : ''}
              {alert.resolutionNote ? `: “${alert.resolutionNote}”` : '.'}
            </span>
          </InlineAlert>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card title="Cancellation" description={OUTCOME_META[record.outcome].help}>
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <Item label="Subscription" value={<span className="font-mono text-xs">{record.subscriptionId}</span>} />
            <Item label="Plan" value={`${plan.name} · ${formatUsd(record.priceUsd)}/mo`} />
            <Item label="Reason" value={record.reason ? REASON_LABELS[record.reason] : 'Not given'} />
            <Item label="Timing" value={TIMING_LABELS[record.timing]} />
            {record.outcome !== 'saved' && (
              <Item
                label="Access ends"
                value={`${formatDate(record.accessEndsAt)} at ${new Date(record.accessEndsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' })}`}
              />
            )}
            <Item label="MRR kept" value={record.mrrKeptUsd > 0 ? `${formatUsd(record.mrrKeptUsd)}/mo` : '—'} />
            <Item
              label="Offers shown"
              value={record.offersShown.length ? record.offersShown.map((o) => OFFER_LABELS[o]).join(', ') : 'None'}
            />
            <Item label="Offer accepted" value={record.offerAccepted ? OFFER_LABELS[record.offerAccepted] : 'None'} />
          </dl>
        </Card>

        <Card
          title="Stripe read-back"
          description="The subscription as Stripe reports it after the change was sent."
          actions={canRetry ? <Badge tone="danger">Not confirmed</Badge> : record.readback ? <Badge tone="success">Read back</Badge> : null}
        >
          {record.readback ? (
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <Item label="Status" value={<StatusBadge status={record.readback.status} />} />
              <Item label="Cancels at period end" value={record.readback.cancelAtPeriodEnd ? 'Yes' : 'No'} />
              <Item label="Cancels at" value={record.readback.cancelAt ? formatDate(record.readback.cancelAt) : '—'} />
              <Item label="Verified" value={formatDateTime(record.readback.verifiedAt)} />
              {subscription && (
                <Item label="Current period ends" value={formatDate(subscription.currentPeriodEnd)} />
              )}
            </dl>
          ) : (
            <p className="text-sm text-muted">No read-back has been recorded for this request yet.</p>
          )}
          {canRetry && (
            <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-muted">
              Retry sends the same update to Stripe again and reads the subscription back. It does not create a second cancellation.
            </p>
          )}
          {busy && <span className="sr-only" role="status">Checking Stripe</span>}
        </Card>

        <Card title="Activity" description="Every step for this cancellation, in order." className="xl:col-span-2" padded={false}>
          {events.length === 0 ? (
            <p className="p-5 text-sm text-muted">No events recorded.</p>
          ) : (
            <ol className="divide-y divide-line">
              {events.map((e) => (
                <li key={e.id} className="grid gap-2 px-5 py-3.5 sm:grid-cols-[170px_220px_1fr] sm:items-center sm:gap-4">
                  <time dateTime={e.at} className="font-mono text-xs text-muted">{formatDateTime(e.at)}</time>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink">{EVENT_LABELS[e.type]}</span>
                    <Badge tone={ACTOR_META[e.actor].tone}>{ACTOR_META[e.actor].label}</Badge>
                  </div>
                  <p className="text-sm text-ink-2">{e.summary}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-ink-2">{value}</dd>
    </div>
  );
}
