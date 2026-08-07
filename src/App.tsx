import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { initTheme } from '@/stores/theme-store';
import { useSyncStore } from '@/stores/sync-store';
import { pruneRouteCache } from '@/lib/routing/routeCache';
import LoginPage from '@/pages/Login';
import DashboardPage from '@/pages/Dashboard';
import HistoryPage from '@/pages/History';
import StatsPage from '@/pages/Stats';
import ShiftPage from '@/pages/shift/Shift';
import SosPage from '@/pages/sos/SOS';
import EarningsPage from '@/pages/earnings/Earnings';
import NotificationsPage from '@/pages/notifications/Notifications';
import IncidentsPage from '@/pages/incidents/Incidents';
import RoutePage from '@/pages/route/Route';
import DeliveryDetailPage from '@/pages/delivery/[id]/DeliveryDetail';
import ProofPage from '@/pages/delivery/[id]/Proof';
import BatteryGuidePage from '@/pages/battery-guide/BatteryGuide';
import LockScreen from '@/pages/lock/LockScreen';
import { LoadingScreen } from '@/components/LoadingScreen';
import { OfferSheet } from '@/components/OfferSheet';
import { HardwareBackHandler } from '@/components/HardwareBackHandler';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Protected() {
  const { isAuthenticated, isBootstrapping } = useAuthStore();

  if (isBootstrapping) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/stats" element={<StatsPage />} />
      <Route path="/shift" element={<ShiftPage />} />
      <Route path="/sos" element={<SosPage />} />
      <Route path="/earnings" element={<EarningsPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/incidents" element={<IncidentsPage />} />
      <Route path="/route" element={<RoutePage />} />
      <Route path="/battery-guide" element={<BatteryGuidePage />} />
      <Route path="/delivery/:id" element={<DeliveryDetailPage />} />
      <Route path="/delivery/:id/proof" element={<ProofPage />} />
      <Route path="/lock" element={<LockScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function OnlineDetector() {
  const setOnline = useSyncStore((s) => s.setOnline);
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [setOnline]);
  return null;
}

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    initTheme();
    void pruneRouteCache();
    bootstrap();
  }, [bootstrap]);

  return (
    <QueryClientProvider client={queryClient}>
      <OnlineDetector />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<Protected />} />
        </Routes>
        <OfferSheet />
        <HardwareBackHandler />
      </BrowserRouter>
    </QueryClientProvider>
  );
}