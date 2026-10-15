import { useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  BellRing,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
  FlaskConical,
  Menu,
  X,
} from 'lucide-react';
import { LogoMark } from '../components/Logo';
import { BRAND } from '../lib/site';
import { Skeleton, ErrorState } from './ui';
import { dashboardApi, keys, useAlerts, useSession } from './lib/api';

const NAV = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/cancellations', label: 'Cancellations', icon: ListChecks, end: false },
  { to: '/app/alerts', label: 'Alerts', icon: BellRing, end: false },
  { to: '/app/activity', label: 'Activity', icon: Activity, end: false },
  { to: '/app/settings', label: 'Settings', icon: Settings, end: false },
] as const;

/** Redirects to sign-in when there is no session. Renders children otherwise. */
export function RequireSession({ children }: { children: ReactNode }) {
  const session = useSession();
  const location = useLocation();

  if (session.isPending) {
    return (
      <div className="grid min-h-dvh place-items-center p-6" role="status">
        <span className="sr-only">Loading your account</span>
        <div className="w-full max-w-sm space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }
  if (session.isError) {
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <ErrorState message="We could not load your session. Check your connection and try again." onRetry={() => session.refetch()} />
      </div>
    );
  }
  if (!session.data) {
    return <Navigate to="/app/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}

export function AppShell() {
  const session = useSession();
  const alerts = useAlerts('open');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const openAlerts = alerts.data?.length ?? 0;
  const isDemo = dashboardApi.mode === 'demo';

  const signOut = async () => {
    await dashboardApi.signOut();
    queryClient.removeQueries({ queryKey: keys.all });
    queryClient.setQueryData(keys.session(), null);
    navigate('/app/login', { replace: true });
  };

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-canvas"
      >
        Skip to content
      </a>

      {isDemo && (
        <div className="flex items-center justify-center gap-2 border-b border-warn/30 bg-warn-soft px-4 py-2 text-center text-xs text-warn">
          <FlaskConical className="size-3.5" aria-hidden="true" />
          <span>
            Demo data. Sample account only. Changes are stored in this browser and nothing reaches Stripe.
          </span>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[248px_1fr]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface lg:flex">
          <div className="flex h-16 items-center px-5">
            <Link to="/app" className="group flex items-center gap-2.5" aria-label={`${BRAND.name} overview`}>
              <LogoMark />
              <span className="font-semibold tracking-tight">{BRAND.name}</span>
            </Link>
          </div>
          <nav aria-label="Dashboard" className="flex-1 space-y-1 px-3 py-4">
            <SideLinks openAlerts={openAlerts} />
          </nav>
          <div className="border-t border-line p-4">
            <p className="truncate text-sm font-medium">{session.data?.businessName}</p>
            <p className="truncate text-xs text-muted">{session.data?.email}</p>
            <button
              type="button"
              onClick={signOut}
              className="mt-3 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur lg:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <Link to="/app" className="group flex items-center gap-2" aria-label={`${BRAND.name} overview`}>
                <LogoMark />
                <span className="font-semibold">{BRAND.name}</span>
              </Link>
              <button
                type="button"
                className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-ink"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                onClick={() => setMenuOpen((v) => !v)}
              >
                {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
              </button>
            </div>
            {menuOpen && (
              <nav id="mobile-nav" aria-label="Dashboard" className="border-t border-line px-3 py-3" onClick={() => setMenuOpen(false)}>
                <SideLinks openAlerts={openAlerts} />
                <button type="button" onClick={signOut} className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2">
                  <LogOut className="size-4" aria-hidden="true" /> Sign out
                </button>
              </nav>
            )}
          </header>

          <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function SideLinks({ openAlerts }: { openAlerts: number }) {
  return (
    <>
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive ? 'bg-surface-2 text-ink' : 'text-muted hover:bg-surface-2/60 hover:text-ink'
            }`
          }
        >
          <Icon className="size-4" aria-hidden="true" />
          <span className="flex-1">{label}</span>
          {label === 'Alerts' && openAlerts > 0 && (
            <span className="rounded-full bg-danger-soft px-1.5 text-xs font-semibold text-danger tabular-nums" aria-label={`${openAlerts} open`}>
              {openAlerts}
            </span>
          )}
        </NavLink>
      ))}
    </>
  );
}

