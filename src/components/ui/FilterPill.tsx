import { cn } from '@/lib/cn';

interface FilterPillProps {
  label: string;
  active?: boolean;
  onClick: () => void;
  count?: number;
}

export function FilterPill({ label, active, onClick, count }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150',
        active ? 'bg-brand text-on-accent shadow-card' : 'bg-raised text-ink-secondary shadow-card hover:bg-highest',
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            'text-[10px] font-bold rounded-full px-1.5 py-0.5',
            active ? 'bg-on-accent/25 text-on-accent' : 'bg-highest text-ink-muted',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}