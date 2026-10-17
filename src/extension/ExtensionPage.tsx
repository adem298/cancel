import { useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { Button, Card, InlineAlert, PageHeader, useDocumentTitle } from '../app/ui';

export function ExtensionPage() {
  useDocumentTitle('Stopbill extension');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !body.url) throw new Error(body.error ?? 'Checkout is unavailable right now.');
      window.location.assign(body.url);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Checkout is unavailable in this environment. It works on the deployed site.'
          : err instanceof Error
            ? err.message
            : 'Checkout failed. Try again.',
      );
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <PageHeader
        eyebrow={<a href="/" className="hover:text-ink">Stopbill</a>}
        title="Stopbill extension"
        description="Using Stopbill is free. The extension is a one-time purchase. It installs on your laptop and guides you through cancelling subscriptions you choose to end."
      />

      {error && (
        <div className="mb-6">
          <InlineAlert>{error}</InlineAlert>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Get the extension" description="One-time payment, then install it on your laptop.">
          <Button variant="primary" busy={busy} onClick={buy} className="w-full">
            Buy the extension
          </Button>
          <p className="mt-3 text-xs text-faint">Price and taxes are shown at checkout. Payments are handled by Stripe.</p>
        </Card>

        <Card title="Install it" description="Load the unpacked extension in Chrome or Edge.">
          <a
            href="/downloads/stopbill-extension.zip"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface-2 px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-3"
          >
            <Download className="size-4" aria-hidden="true" />
            Download (.zip)
          </a>
          <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-muted">
            <li>Unzip the file.</li>
            <li>Open chrome://extensions and turn on Developer mode.</li>
            <li>Choose “Load unpacked” and select the unzipped folder.</li>
            <li>Click the Stopbill icon and enter your license key.</li>
          </ol>
        </Card>
      </div>

      <section className="mt-6 panel p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
          <div className="text-sm text-muted">
            <p className="font-medium text-ink">What the extension does and does not do</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Each step runs only after you click it. Nothing happens in the background.</li>
              <li>It does not ask for or store your passwords or card details.</li>
              <li>A service is added only after its terms have been reviewed. Until then, you see guided steps only.</li>
              <li>One license works on up to two devices.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
