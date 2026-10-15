import { Route, Routes } from 'react-router';
import { AppShell, RequireSession } from './Shell';
import { LoginPage } from './pages/Login';
import { OverviewPage } from './pages/Overview';
import { CancellationsPage } from './pages/Cancellations';
import { CancellationDetailPage } from './pages/CancellationDetail';
import { AlertsPage } from './pages/Alerts';
import { ActivityPage } from './pages/Activity';
import { SettingsPage } from './pages/Settings';
import { NotFound } from './NotFound';
import { AppProviders } from './providers';

/** Routes mounted under /app/*. */
export function DashboardRoutes() {
  return (
    <AppProviders>
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route
        element={
          <RequireSession>
            <AppShell />
          </RequireSession>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="cancellations" element={<CancellationsPage />} />
        <Route path="cancellations/:id" element={<CancellationDetailPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </AppProviders>
  );
}
