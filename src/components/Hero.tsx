import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { BRAND } from '../lib/site';

function PopupPreview() {
  const steps = [
    { label: 'Sign in to ChatGPT with the account you paid with', done: true },
    { label: 'Open your account menu and select Settings', done: true },
    { label: 'Select Billing', done: false, current: true },
    { label: 'Under “Cancel plan”, select Cancel, then confirm', done: false },
  ];
  return (
    <div className="panel relative overflow-hidden p-0" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="font-mono text-xs text-muted">Stopbill · ChatGPT · web</span>
        <span className="font-mono text-[0.7rem] text-faint">2 of 4</span>
      </div>
      <ol className="grid gap-2 p-4">
        {steps.map((step) => (
          <li
            key={step.label}
            className={`flex gap-3 rounded-lg border p-3 text-sm ${step.current ? 'border-accent/60 bg-accent-soft' : 'border-line bg-surface-2'}`}
          >
            <span
              className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded border ${
                step.done ? 'border-accent bg-accent text-canvas' : 'border-line-strong'
              }`}
            >
              {step.done && <Check className="size-3" strokeWidth={3} />}
            </span>
            <span className={step.done ? 'text-faint line-through decoration-faint/60' : 'text-ink-2'}>{step.label}</span>
          </li>
        ))}
      </ol>
      <p className="border-t border-line px-4 py-3 font-mono text-[0.7rem] text-faint">You click. Stopbill does not click for you.</p>
    </div>
  );
}

export function Hero() {
  return (
    <section className="bg-grid relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="glow-accent pointer-events-none absolute inset-x-0 top-0 h-[480px]" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-(--container-page) items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="eyebrow mb-5">Free browser extension · ChatGPT first</p>
          <h1 className="text-4xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Cancel ChatGPT without hunting through settings.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            {BRAND.name} is a free browser extension with a guided checklist. It shows the exact steps for where you pay,
            opens ChatGPT when you ask, and tracks your progress. You click every step yourself.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#install" className="btn-primary">
              Get the extension
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
            <a href="#steps" className="btn-secondary">
              See the steps
            </a>
          </div>
          <p className="mt-6 flex items-start gap-2 text-sm text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
            <span>No account, no password, no card details. {BRAND.name} is not affiliated with OpenAI.</span>
          </p>
        </div>
        <PopupPreview />
      </div>
    </section>
  );
}
