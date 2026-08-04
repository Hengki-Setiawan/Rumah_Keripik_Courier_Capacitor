import { House, ScrollText, ChartColumnBig, UserRound } from 'lucide-react';
import { cn } from '@/lib/cn';

export type TabKey = 'beranda' | 'history' | 'stats' | 'profil';

interface BottomTabBarProps {
  active: TabKey;
  onChange: (t: TabKey) => void;
}

const tabs: Array<{ key: TabKey; label: string; icon: typeof House }> = [
  { key: 'beranda', label: 'Beranda', icon: House },
  { key: 'history', label: 'History', icon: ScrollText },
  { key: 'stats', label: 'Statistik', icon: ChartColumnBig },
  { key: 'profil', label: 'Profil', icon: UserRound },
];

export function BottomTabBar({ active, onChange }: BottomTabBarProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-umber-700/70 bg-umber-950/95 backdrop-blur-lg safe-area-bottom">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
        {tabs.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-amber-500' : 'text-umber-400',
              )}
            >
              <Icon className={cn('size-5', isActive && 'drop-shadow-glow-amber')} strokeWidth={isActive ? 2.4 : 1.8} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}