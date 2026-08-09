import { cn } from '@/lib/cn';

interface FABProps {
  icon: React.ReactNode;
  onClick?: () => void;
  ariaLabel: string;
  variant?: 'primary' | 'overlay';
  className?: string;
  active?: boolean;
}

export function FAB({ icon, onClick, ariaLabel, variant = 'primary', className, active }: FABProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'pointer-events-auto flex size-14 items-center justify-center rounded-full transition-all active:scale-95 shadow-card-lg',
        variant === 'primary' && 'bg-brand text-on-accent hover:bg-brand-hover',
        variant === 'overlay' && 'bg-raised/95 text-ink backdrop-blur hover:bg-highest',
        active && 'bg-brand text-on-accent ring-2 ring-white',
        className,
      )}
    >
      {icon}
    </button>
  );
}