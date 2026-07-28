import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AdminPortal } from './admin/AdminPortal.tsx';
import { LanguageProvider } from './i18n/LanguageContext.tsx';
import './index.css';

const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      {isAdminPath ? <AdminPortal /> : <App />}
    </LanguageProvider>
  </StrictMode>
);
