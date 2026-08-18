import { useState, type ReactNode } from 'react';
import { Bell, WifiOff, CloudUpload, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useSyncStore } from '@/stores/sync-store';
import { useNavigate } from 'react-router-dom';
import { BottomTabBar, type TabKey } from '@/components/ui/BottomTabBar';
import { SettingsSheet } from '@/components/SettingsSheet';
import { PullToRefresh } from '@/components/PullToRefresh';
import { cn } from '@/lib/cn';

interface AppShellProps {
  children: ReactNode;
  title?: string;
  activeTab?: TabKey;
  onTabChange?: (t: TabKey) => void;
  onRefresh?: () => void | Promise<void>;
  onBack?: () => void;
}

export function AppShell({ children, title, activeTab, onTabChange, onRefresh, onBack }: AppShellProps) {
  const courier = useAuthStore((s) => s.courier);
  const { isOnline, pendingCount, isSyncing, syncNow } = useSyncStore();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    if (!onRefresh || manualRefreshing) return;
    setManualRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setManualRefreshing(false);
    }
  };

  return (
    <div className="min-h-dvh pb-28">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-surface/85 backdrop-blur-xl shadow-xs pt-[env(safe-area-inset-top,0px)]">
        {onBack ? (
          <div className="mx-auto grid max-w-md grid-cols-[44px_1fr_44px] items-center px-4 py-2.5">
            <button
              onClick={onBack}
              aria-label="Kembali"
              className="flex size-10 items-center justify-center rounded-2xl bg-raised/80 border border-border-subtle text-ink shadow-sm active:scale-95 transition-all"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="truncate text-center text-sm font-bold leading-tight text-ink">{title ?? 'Rumah Keripik'}</h1>
            <div className="flex items-center justify-end gap-1.5">
              {!isOnline && (
                <span className="flex items-center gap-1 rounded-full bg-alert-soft border border-alert/30 px-2 py-0.5 text-[10px] font-bold text-alert">
                  <WifiOff className="size-3" /> Off
                </span>
              )}
              <button
                onClick={() => navigate('/notifications')}
                aria-label="Notifikasi"
                className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-ink-muted hover:text-ink hover:bg-raised/60 transition-all active:scale-95"
              >
                <Bell className="size-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              {courier ? (
                <button
                  onClick={() => setSettingsOpen(true)}
                  aria-label="Menu pengaturan"
                  className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft border border-brand/25 text-brand-pressed font-extrabold text-sm shadow-sm active:scale-95 transition-transform"
                >
                  {courier.name?.charAt(0) ?? 'K'}
                </button>
              ) : null}
              <div className="min-w-0">
                <h1 className="truncate text-sm font-extrabold leading-tight text-ink">{title ?? 'Rumah Keripik'}</h1>
                {courier && <p className="truncate text-[11px] font-medium text-ink-muted">{courier.name}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {!isOnline && (
                <span className="flex items-center gap-1 rounded-full bg-alert-soft border border-alert/30 px-2.5 py-1 text-[10px] font-bold text-alert">
                  <WifiOff className="size-3" /> Offline
                </span>
              )}
              {pendingCount > 0 && (
                <button
                  onClick={() => syncNow()}
                  className="flex h-8 items-center gap-1.5 rounded-full bg-brand-soft border border-brand/30 px-2.5 text-[10px] font-bold text-brand-pressed shadow-xs active:scale-95 transition-all"
                >
                  <CloudUpload className={cn('size-3.5', isSyncing && 'animate-pulse')} />
                  <span>{pendingCount}</span>
                </button>
              )}
              {onRefresh && (
                <button
                  onClick={handleManualRefresh}
                  aria-label="Segarkan data"
                  className="flex size-10 items-center justify-center rounded-2xl text-ink-muted hover:text-ink hover:bg-raised/60 transition-all active:scale-95"
                >
                  <svg className={cn('size-4', (isSyncing || manualRefreshing) && 'animate-spin text-brand')} viewBox="0 0 24 24" fill="none">
                    <path d="M20 11A8 8 0 104 11m0 0v-6m0 6h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => navigate('/notifications')}
                aria-label="Notifikasi"
                className="flex size-10 items-center justify-center rounded-2xl text-ink-muted hover:text-ink hover:bg-raised/60 transition-all active:scale-95"
              >
                <Bell className="size-5" />
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-md px-4 py-3">
        {onRefresh ? (
          <PullToRefresh onRefresh={onRefresh} className="relative">
            {children}
          </PullToRefresh>
        ) : (
          children
        )}
      </main>

      {activeTab && onTabChange && <BottomTabBar active={activeTab} onChange={onTabChange} />}
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}