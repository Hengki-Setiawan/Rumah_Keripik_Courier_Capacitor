import { useState, type ReactNode } from 'react';
import { Bell, WifiOff, CloudUpload, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useSyncStore } from '@/stores/sync-store';
import { useNavigate } from 'react-router-dom';
import { BottomTabBar, type TabKey } from '@/components/ui/BottomTabBar';
import { SettingsSheet } from '@/components/SettingsSheet';
import { cn } from '@/lib/cn';

interface AppShellProps {
  children: ReactNode;
  title?: string;
  activeTab?: TabKey;
  onTabChange?: (t: TabKey) => void;
  onRefresh?: () => void;
  onBack?: () => void;
}

export function AppShell({ children, title, activeTab, onTabChange, onRefresh, onBack }: AppShellProps) {
  const courier = useAuthStore((s) => s.courier);
  const { isOnline, pendingCount, isSyncing, syncNow } = useSyncStore();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface/90 backdrop-blur-lg">
        {onBack ? (
          <div className="mx-auto grid max-w-md grid-cols-[44px_1fr_44px] items-center px-4 py-3">
            <button
              onClick={onBack}
              aria-label="Kembali"
              className="size-11 shrink-0 items-center justify-center rounded-full bg-raised text-ink-secondary shadow-card active:scale-95 transition-transform"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="truncate text-center text-sm font-bold leading-tight text-ink">{title ?? 'Rumah Keripik'}</h1>
            <div className="flex items-center justify-end gap-2">
              {!isOnline && (
                <span className="flex items-center gap-1 rounded-full bg-alert-soft px-2 py-1 text-[10px] font-semibold text-alert">
                  <WifiOff className="size-3" /> Offline
                </span>
              )}
              <button
                onClick={() => navigate('/notifications')}
                aria-label="Notifikasi"
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:text-ink"
              >
                <Bell className="size-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              {courier ? (
                <button
                  onClick={() => setSettingsOpen(true)}
                  aria-label="Menu pengaturan"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-pressed font-bold text-sm active:scale-95 transition-transform"
                >
                  {courier.name?.charAt(0) ?? 'K'}
                </button>
              ) : null}
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold leading-tight text-ink">{title ?? 'Rumah Keripik'}</h1>
                {courier && <p className="truncate text-[11px] text-ink-muted">{courier.name}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isOnline && (
                <span className="flex items-center gap-1 rounded-full bg-alert-soft px-2 py-1 text-[10px] font-semibold text-alert">
                  <WifiOff className="size-3" /> Offline
                </span>
              )}
              {pendingCount > 0 && (
                <button
                  onClick={() => syncNow()}
                  className="flex h-11 items-center gap-1 rounded-full bg-brand-soft px-2 text-[10px] font-semibold text-brand-pressed"
                >
                  <CloudUpload className={cn('size-3', isSyncing && 'animate-pulse')} />
                  {pendingCount}
                </button>
              )}
              {onRefresh && (
                <button onClick={onRefresh} className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:text-ink">
                  <svg className={cn('size-4', isSyncing && 'animate-spin')} viewBox="0 0 24 24" fill="none">
                    <path d="M20 11A8 8 0 104 11m0 0v-6m0 6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => navigate('/notifications')}
                className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:text-ink"
              >
                <Bell className="size-5" />
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-md px-4 py-4">{children}</main>

      {activeTab && onTabChange && <BottomTabBar active={activeTab} onChange={onTabChange} />}
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}