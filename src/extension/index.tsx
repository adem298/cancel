import { Route, Routes } from 'react-router';
import { NotFound } from '../app/NotFound';
import { ToastProvider } from '../app/ui';
import { ExtensionPage } from './ExtensionPage';
import { SuccessPage } from './SuccessPage';

export default function ExtensionRoutes() {
  return (
    <ToastProvider>
      <Routes>
        <Route index element={<ExtensionPage />} />
        <Route path="success" element={<SuccessPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ToastProvider>
  );
}
