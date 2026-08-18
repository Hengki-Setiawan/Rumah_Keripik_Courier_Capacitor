import { cn } from '@/lib/cn';
import { hapticImpact } from '@/lib/haptics';
import { sound } from '@/lib/sound';

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
        sound.playKeypadClick();
        void hapticImpact('light');
        onClick();
      }}
      aria-label={label ?? `Angka ${digit}`}
      className={cn(
        'flex size-20 items-center justify-center rounded-3xl border border-white/10 bg-surface/90 text-2xl font-bold text-ink shadow-card backdrop-blur-md transition-all active:scale-90 active:bg-brand/20 active:border-brand/40 hover:bg-raised',
        className,
      )}
    >
      {digit}
    </button>
  );
}