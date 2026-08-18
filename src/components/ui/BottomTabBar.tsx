import { House, ScrollText, ChartColumnBig } from 'lucide-react';
import { m } from 'motion/react';
import { cn } from '@/lib/cn';

export type TabKey = 'beranda' | 'history' | 'stats';

interface BottomTabBarProps {
  active: TabKey;
  onChange: (t: TabKey) => void;
}

const tabs: Array<{ key: TabKey; label: string; icon: typeof House }> = [
  { key: 'beranda', label: 'Beranda', icon: House },
  { key: 'history', label: 'History', icon: ScrollText },
  { key: 'stats', label: 'Statistik', icon: ChartColumnBig },
];

export function BottomTabBar({ active, onChange }: BottomTabBarProps) {
  return (
    <nav className="fixed bottom-3 inset-x-0 z-40 pointer-events-none px-4 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="pointer-events-auto mx-auto flex max-w-[340px] items-stretch justify-around rounded-full border border-white/10 bg-surface/90 p-1.5 shadow-floating backdrop-blur-2xl">
        {tabs.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              aria-label={label}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-bold transition-all active:scale-95',
                isActive ? 'text-brand' : 'text-ink-muted hover:text-ink',
              )}
            >
              {isActive && (
                <m.div
                  layoutId="tab-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-0 rounded-full bg-brand-soft border border-brand/20 shadow-sm"
                />
              )}
              <Icon
                className={cn(
                  'relative z-10 size-5 transition-transform duration-200',
                  isActive && 'scale-110 drop-shadow-[0_0_8px_rgba(217,119,6,0.5)]',
                )}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span className="relative z-10 tracking-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}