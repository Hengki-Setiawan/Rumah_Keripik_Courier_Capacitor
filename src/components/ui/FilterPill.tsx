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
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-amber-500 text-umber-950 border-amber-500'
          : 'bg-umber-900 border-umber-700 text-umber-300 hover:border-umber-500',
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            'text-[10px] font-bold rounded-full px-1.5',
            active ? 'bg-umber-950/20 text-umber-950' : 'bg-umber-800 text-umber-400',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}