import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './index.css';
import App from './App';
import { NotFound } from './app/NotFound';

// The dashboard is code-split so the marketing page stays light.
const DashboardRoutes = lazy(() => import('./app/AppRoutes').then((m) => ({ default: m.DashboardRoutes })));

const ExtensionRoutes = lazy(() => import('./extension'));

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root was not found.');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route
            path="/app/*"
            element={
              <Suspense fallback={<div className="grid min-h-dvh place-items-center text-sm text-muted" role="status">Loading dashboard…</div>}>
                <DashboardRoutes />
              </Suspense>
            }
          />
          <Route
            path="/extension/*"
            element={
              <Suspense fallback={<div className="grid min-h-dvh place-items-center text-sm text-muted" role="status">Loading…</div>}>
                <ExtensionRoutes />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
    </BrowserRouter>
  </StrictMode>,
);
