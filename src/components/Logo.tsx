import { BRAND } from '../lib/site';

type LogoProps = { className?: string };

/** Wordmark: a circle with a diagonal stroke, the "stop" mark. */
export function Logo({ className = '' }: LogoProps) {
  return (
    <a
      href="#top"
      aria-label={`${BRAND.name} home`}
      className={`group inline-flex items-center gap-2.5 rounded-md font-semibold tracking-tight text-ink ${className}`}
    >
      <span
        aria-hidden="true"
        className="grid size-7 place-items-center rounded-lg border border-line-strong bg-surface-2 transition-colors group-hover:border-accent/60"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
          <circle cx="12" cy="12" r="8.5" className="text-accent" />
          <path d="M7.5 16.5 16.5 7.5" className="text-accent" />
        </svg>
      </span>
      <span className="text-[0.95rem]">{BRAND.name}</span>
    </a>
  );
}
