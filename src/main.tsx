import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { I18nProvider } from './i18n';
import { SocketProvider } from './contexts/SocketContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <SocketProvider>
        <App />
      </SocketProvider>
    </I18nProvider>
  </StrictMode>,
);
