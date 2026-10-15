import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Download, Search } from 'lucide-react';
import { toCsv, type CsvColumn } from '../../shared/csv';
import { utcDay } from '../../shared/format';
import { getPlan, OFFER_LABELS, REASON_LABELS, TIMING_LABELS } from '../../shared/catalog';
import type { CancellationOutcome, CancellationQuery, CancellationRecord, ReasonId } from '../../shared/types';
import { Button, Card, EmptyState, ErrorState, LoadingBlock, Pagination, PageHeader, inputClass, useDocumentTitle, useToast } from '../ui';
import { CancellationTable } from '../components/CancellationTable';
import { OUTCOME_META } from '../lib/labels';
import { dashboardApi, useCancellations } from '../lib/api';

const PAGE_SIZE = 12;
const OUTCOMES = Object.keys(OUTCOME_META) as CancellationOutcome[];
const REASONS = Object.keys(REASON_LABELS) as ReasonId[];

function parseQuery(params: URLSearchParams): CancellationQuery {
  const outcome = params.get('outcome');
  const reason = params.get('reason');
  const page = Number(params.get('page') ?? '1');
  return {
    search: params.get('q') ?? '',
    outcome: outcome && (OUTCOMES as string[]).includes(outcome) ? (outcome as CancellationOutcome) : 'all',
    reason: reason && (REASONS as string[]).includes(reason) ? (reason as ReasonId) : 'all',
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: PAGE_SIZE,
  };
}

export function CancellationsPage() {
  useDocumentTitle('Cancellations');
  const [params, setParams] = useSearchParams();
  const query = parseQuery(params);
  const [search, setSearch] = useState(query.search ?? '');
  const list = useCancellations(query);
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '' || v === 'all') next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    update({ q: search.trim() });
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      // Pull every page that matches the current filters, not only the visible one.
      const all: CancellationRecord[] = [];
      for (let page = 1; ; page++) {
        const res = await dashboardApi.listCancellations({ ...query, page, pageSize: 200 });
        all.push(...res.items);
        if (all.length >= res.total || res.items.length === 0) break;
      }
      const columns: CsvColumn<CancellationRecord>[] = [
        { header: 'Cancellation ID', value: (r) => r.id },
        { header: 'Requested (UTC)', value: (r) => r.createdAt },
        { header: 'Customer (masked)', value: (r) => r.customerEmail },
        { header: 'Subscription', value: (r) => r.subscriptionId },
        { header: 'Plan', value: (r) => getPlan(r.planId).name },
        { header: 'Price (USD/mo)', value: (r) => r.priceUsd },
        { header: 'Reason', value: (r) => (r.reason ? REASON_LABELS[r.reason] : '') },
        { header: 'Timing', value: (r) => TIMING_LABELS[r.timing] },
        { header: 'Offers shown', value: (r) => r.offersShown.map((o) => OFFER_LABELS[o]).join('; ') },
        { header: 'Offer accepted', value: (r) => (r.offerAccepted ? OFFER_LABELS[r.offerAccepted] : '') },
        { header: 'Outcome', value: (r) => OUTCOME_META[r.outcome].label },
        { header: 'Access ends (UTC day)', value: (r) => utcDay(r.accessEndsAt) },
        { header: 'Stripe status after read-back', value: (r) => r.readback?.status ?? '' },
        { header: 'MRR kept (USD)', value: (r) => r.mrrKeptUsd },
      ];
      const csv = toCsv(all, columns);
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `stopbill-cancellations-${utcDay(new Date().toISOString())}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.notify('success', `Exported ${all.length} cancellation${all.length === 1 ? '' : 's'}. Emails are masked.`);
    } catch {
      toast.notify('error', 'Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const hasFilters = Boolean(query.search) || query.outcome !== 'all' || query.reason !== 'all';

  return (
    <>
      <PageHeader
        title="Cancellations"
        description="Every cancel request from your widget, with the offer shown and the Stripe read-back."
        actions={
          <Button onClick={exportCsv} busy={exporting} variant="secondary">
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </Button>
        }
      />

      <Card padded={false}>
        <form onSubmit={submitSearch} role="search" className="flex flex-wrap gap-3 border-b border-line p-4">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Search by customer or subscription ID</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer or subscription ID"
              className={`${inputClass} pl-9`}
            />
          </label>
          <label className="sr-only" htmlFor="filter-outcome">Outcome</label>
          <select id="filter-outcome" className={`${inputClass} w-auto min-w-[160px]`} value={query.outcome}
            onChange={(e) => update({ outcome: e.target.value })}>
            <option value="all">All outcomes</option>
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>{OUTCOME_META[o].label}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="filter-reason">Reason</label>
          <select id="filter-reason" className={`${inputClass} w-auto min-w-[200px]`} value={query.reason}
            onChange={(e) => update({ reason: e.target.value })}>
            <option value="all">All reasons</option>
            {REASONS.map((r) => (
              <option key={r} value={r}>{REASON_LABELS[r]}</option>
            ))}
          </select>
          {hasFilters && (
            <Button variant="ghost" onClick={() => { setSearch(''); setParams(new URLSearchParams(), { replace: true }); }}>
              Clear filters
            </Button>
          )}
        </form>

        {list.isError ? (
          <ErrorState message="Cancellations could not be loaded." onRetry={() => list.refetch()} />
        ) : !list.data ? (
          <LoadingBlock label="Loading cancellations" />
        ) : list.data.items.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'No cancellations match these filters' : 'No cancellations yet'}
            body={hasFilters ? 'Try a different outcome, reason, or search term.' : 'Requests from the cancel widget will show up here.'}
          />
        ) : (
          <div aria-busy={list.isFetching || undefined}>
            <CancellationTable rows={list.data.items} caption="Cancellation requests" />
            <Pagination
              page={query.page}
              pageSize={PAGE_SIZE}
              total={list.data.total}
              onPage={(p) => update({ page: String(p) })}
            />
          </div>
        )}
      </Card>

      <p className="mt-4 text-xs text-faint">Customer emails are masked. Exports contain the same masked values.</p>
    </>
  );
}
