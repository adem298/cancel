import { formatDate, formatInt } from '../../shared/format';
import type { OverviewPoint } from '../../shared/types';

/** Grouped daily bars: cancellation requests (muted) and saves (accent). Pure SVG, no chart library. */
export function CancelChart({ series }: { series: OverviewPoint[] }) {
  const W = 720;
  const H = 240;
  const padL = 36;
  const padB = 28;
  const padT = 12;
  const plotW = W - padL - 8;
  const plotH = H - padB - padT;

  const total = series.reduce((sum, p) => sum + p.cancellations, 0);
  const saved = series.reduce((sum, p) => sum + p.saved, 0);
  const max = Math.max(4, ...series.map((p) => p.cancellations));
  const step = Math.max(1, Math.ceil(max / 4));
  const yMax = step * 4;
  const slot = series.length > 0 ? plotW / series.length : plotW;
  const barW = Math.max(1, Math.min(18, slot * 0.36));
  const ticks = [0, step, step * 2, step * 3, yMax];
  const labelEvery = Math.max(1, Math.ceil(series.length / 6));

  const summary = `${formatInt(total)} cancellation requests and ${formatInt(saved)} saves over ${series.length} days.`;

  return (
    <figure>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-sm bg-line-strong" aria-hidden="true" />
          Cancellation requests
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-sm bg-accent" aria-hidden="true" />
          Saved by offers
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={summary}>
        {ticks.map((t) => {
          const y = padT + plotH - (t / yMax) * plotH;
          return (
            <g key={t}>
              <line x1={padL} x2={W - 8} y1={y} y2={y} className="stroke-line" strokeDasharray={t === 0 ? undefined : '3 4'} />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-faint text-[11px]" style={{ fontFamily: 'var(--font-mono)' }}>
                {formatInt(Math.round(t))}
              </text>
            </g>
          );
        })}
        {series.map((p, i) => {
          const x = padL + i * slot + slot / 2;
          const hC = (p.cancellations / yMax) * plotH;
          const hS = (p.saved / yMax) * plotH;
          const base = padT + plotH;
          return (
            <g key={p.date}>
              <title>{`${formatDate(p.date + 'T00:00:00Z')}: ${p.cancellations} requests, ${p.saved} saved`}</title>
              <rect x={x - barW - 1} y={base - hC} width={barW} height={Math.max(hC, 0)} rx={1.5} className="fill-line-strong" />
              <rect x={x + 1} y={base - hS} width={barW} height={Math.max(hS, 0)} rx={1.5} className="fill-accent" />
              {i % labelEvery === 0 && (
                <text x={x} y={H - 8} textAnchor="middle" className="fill-faint text-[11px]" style={{ fontFamily: 'var(--font-mono)' }}>
                  {shortDay(p.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

function shortDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
