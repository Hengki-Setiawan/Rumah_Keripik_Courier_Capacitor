import { cn } from '@/lib/cn';
import { hapticImpact } from '@/lib/haptics';

interface NumpadKeyProps {
  digit: string;
  onClick: () => void;
  className?: string;
  label?: string;
}

export function NumpadKey({ digit, onClick, className, label }: NumpadKeyProps) {
  return (
    <button
      type="button"
      onClick={() => {
        void hapticImpact('light');
        onClick();
      }}
      aria-label={label ?? `Angka ${digit}`}
      className={cn(
        'flex size-20 items-center justify-center rounded-full bg-surface text-2xl font-semibold text-ink shadow-card active:scale-95 transition-all',
        className,
      )}
    >
      {digit}
    </button>
  );
}