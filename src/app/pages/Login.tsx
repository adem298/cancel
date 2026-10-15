import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { LogoMark } from '../../components/Logo';
import { BRAND } from '../../lib/site';
import { ApiError } from '../../shared/types';
import { isValidEmail } from '../../shared/format';
import { Button, Field, InlineAlert, inputClass, useDocumentTitle, useFieldId } from '../ui';
import { dashboardApi, keys, useSession } from '../lib/api';

export function LoginPage() {
  useDocumentTitle('Sign in');
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const session = useSession();
  const emailId = useFieldId('email');
  const passId = useFieldId('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);
  const isDemo = dashboardApi.mode === 'demo';

  if (session.data) {
    const from = (location.state as { from?: string } | null)?.from ?? '/app';
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof fieldErrors = {};
    if (!isValidEmail(email)) next.email = 'Enter a valid work email.';
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    setFieldErrors(next);
    setError(null);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const s = await dashboardApi.signIn(email.trim(), password);
      queryClient.setQueryData(keys.session(), s);
      const from = (location.state as { from?: string } | null)?.from ?? '/app';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col justify-between p-6 sm:p-10">
        <a href="/" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to {BRAND.name}
        </a>

        <div className="mx-auto w-full max-w-sm py-16">
          <div className="mb-8 flex items-center gap-2.5">
            <LogoMark />
            <span className="font-semibold tracking-tight">{BRAND.name}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to your dashboard</h1>
          <p className="mt-2 text-sm text-muted">Review cancellations, alerts, and billing checks for your Stripe account.</p>

          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5" aria-describedby={error ? 'login-error' : undefined}>
            {error && (
              <div id="login-error">
                <InlineAlert>{error}</InlineAlert>
              </div>
            )}
            <Field label="Work email" htmlFor={emailId} error={fieldErrors.email}>
              <input
                id={emailId}
                type="email"
                autoComplete="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(fieldErrors.email) || undefined}
                required
              />
            </Field>
            <Field label="Password" htmlFor={passId} error={fieldErrors.password}>
              <input
                id={passId}
                type="password"
                autoComplete="current-password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(fieldErrors.password) || undefined}
                required
              />
            </Field>
            <Button type="submit" variant="primary" className="w-full" busy={busy}>
              Sign in
            </Button>
          </form>

          {isDemo && (
            <p className="mt-6 rounded-lg border border-line bg-surface p-4 text-xs leading-relaxed text-muted">
              <span className="font-medium text-ink-2">Demo account.</span> Use any valid email and a password of at least 8 characters.
              No real account is accessed.
            </p>
          )}
        </div>

        <p className="text-xs text-faint">Built for Stripe-billed SaaS teams. Card data stays with Stripe.</p>
      </div>

      <div className="hidden border-l border-line bg-surface lg:block">
        <div className="flex h-full flex-col justify-center p-16">
          <p className="text-sm text-accent">Cancellations that actually stop billing</p>
          <blockquote className="mt-6 max-w-md font-mono text-sm leading-relaxed text-ink-2">
            <p>Each cancellation is read back from Stripe.</p>
            <p>If billing did not change, you get an alert</p>
            <p>with the expected and actual state.</p>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
