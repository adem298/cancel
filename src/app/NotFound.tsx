import { Link } from 'react-router';
import { useDocumentTitle } from './ui';

export function NotFound() {
  useDocumentTitle('Not found');
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="font-mono text-sm text-accent">404</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">This page does not exist.</h1>
        <p className="mt-2 text-sm text-muted">Check the address, or go back to the overview.</p>
        <Link to="/app" className="mt-6 inline-flex rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-canvas hover:bg-accent-strong">
          Go to overview
        </Link>
      </div>
    </div>
  );
}
