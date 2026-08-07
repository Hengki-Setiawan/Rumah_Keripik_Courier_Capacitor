import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Capacitor } from '@capacitor/core';
import { initAnalytics } from './lib/analytics';
import './styles/global.css';

initAnalytics();

// Capgo: konfirmasi bundle sehat SEJAK AWAL agar tidak di-rollback otomatis.
if (Capacitor.isNativePlatform()) {
  import('@capgo/capacitor-updater')
    .then(({ CapacitorUpdater }) => CapacitorUpdater.notifyAppReady())
    .catch(() => undefined);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
