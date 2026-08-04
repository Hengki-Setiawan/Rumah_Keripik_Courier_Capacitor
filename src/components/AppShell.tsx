import type { ReactNode } from 'react';
import { Bell, WifiOff, CloudUpload } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useSyncStore } from '@/stores/sync-store';
import { useNavigate } from 'react-router-dom';
import { BottomTabBar, type TabKey } from '@/components/ui/BottomTabBar';
import { cn } from '@/lib/cn';

interface AppShellProps {
  children: ReactNode;
  title?: string;
  activeTab?: TabKey;
  onTabChange?: (t: TabKey) => void;
  onRefresh?: () => void;
}

export function AppShell({ children, title, activeTab, onTabChange, onRefresh }: AppShellProps) {
  const courier = useAuthStore((s) => s.courier);
  const { isOnline, pendingCount, isSyncing, syncNow } = useSyncStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-30 border-b border-umber-700/60 bg-umber-950/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {courier && (
              <div className="flex size-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-400 font-bold text-sm">
                {courier.name?.charAt(0) ?? 'K'}
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold leading-tight">{title ?? 'Rumah Keripik'}</h1>
              {courier && <p className="text-[11px] text-umber-400">{courier.name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-semibold text-red-400">
                <WifiOff className="size-3" /> Offline
              </span>
            )}
            {pendingCount > 0 && (
              <button
                onClick={() => syncNow()}
                className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-400"
              >
                <CloudUpload className={cn('size-3', isSyncing && 'animate-pulse')} />
                {pendingCount}
              </button>
            )}
            {onRefresh && (
              <button onClick={onRefresh} className="rounded-full p-2 text-umber-400 hover:text-umber-200">
                <svg className={cn('size-4', isSyncing && 'animate-spin')} viewBox="0 0 24 24" fill="none">
                  <path d="M20 11A8 8 0 104 11m0 0v-6m0 6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <button
              onClick={() => navigate('/notifications')}
              className="relative rounded-full p-2 text-umber-400 hover:text-umber-200"
            >
              <Bell className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4">{children}</main>

      {activeTab && onTabChange && <BottomTabBar active={activeTab} onChange={onTabChange} />}
    </div>
  );
}