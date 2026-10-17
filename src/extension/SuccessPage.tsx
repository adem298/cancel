import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useLocation } from 'react-router';
import { Button, Card, ErrorState, LoadingBlock, PageHeader, useDocumentTitle, useToast } from '../app/ui';

type State =
  | { phase: 'waiting' }
  | { phase: 'issued'; key: string }
  | { phase: 'error'; message: string };

const MAX_ATTEMPTS = 15;

export function SuccessPage() {
  useDocumentTitle('Purchase complete');
  const sessionId = new URLSearchParams(useLocation().search).get('session_id');
  const [state, setState] = useState<State>({ phase: 'waiting' });
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setState({ phase: 'error', message: 'This page needs a purchase reference. Use the link from your checkout confirmation.' });
      return;
    }
    let cancelled = false;
    let timer: number | undefined;

    const attempt = async (n: number) => {
      try {
        const res = await fetch(`/api/license/claim?session_id=${encodeURIComponent(sessionId)}`);
        if (cancelled) return;
        if (res.status === 200) {
          const body = (await res.json()) as { licenseKey: string };
          setState({ phase: 'issued', key: body.licenseKey });
          return;
        }
        if (res.status === 202 && n < MAX_ATTEMPTS) {
          timer = window.setTimeout(() => attempt(n + 1), 2000);
          return;
        }
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setState({
          phase: 'error',
          message:
            res.status === 202
              ? 'Your payment is still being confirmed. Refresh this page in a minute.'
              : body.error ?? 'We could not issue your license. Contact support with your receipt.',
        });
      } catch {
        if (!cancelled) setState({ phase: 'error', message: 'Could not reach Stopbill. Check your connection and refresh.' });
      }
    };
    void attempt(0);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [sessionId]);

  const copy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.notify('error', 'Copy failed. Select the key and copy it manually.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <PageHeader title="Thanks for your purchase" description="Your license key is shown once. Save it before you leave this page." />

      {state.phase === 'waiting' && (
        <Card padded={false}>
          <LoadingBlock label="Confirming your payment" />
        </Card>
      )}

      {state.phase === 'error' && <ErrorState message={state.message} />}

      {state.phase === 'issued' && (
        <Card title="Your license key" description="Paste it into the Stopbill extension on each device (up to two).">
          <div className="flex flex-wrap items-center gap-3">
            <code className="flex-1 rounded-lg border border-line bg-canvas px-4 py-3 font-mono text-lg tracking-wider text-accent" aria-label="License key">
              {state.key}
            </code>
            <Button onClick={() => copy(state.key)}>
              {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted">
            We store only a hash of this key. If you lose it, contact support with your receipt.
          </p>
          <div className="mt-5">
            <a href="/extension" className="text-sm text-accent hover:underline">Back to the extension page</a>
          </div>
        </Card>
      )}
    </div>
  );
}
