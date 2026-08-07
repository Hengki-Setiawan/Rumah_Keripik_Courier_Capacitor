import { CheckCircle2, Info, TriangleAlert, XCircle } from 'lucide-react';
import { useToastStore } from '@/stores/toast-store';
import { cn } from '@/lib/cn';

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: XCircle,
};

const STYLES: Record<string, string> = {
  info: 'bg-ink text-white',
  success: 'bg-ok text-on-accent',
  warning: 'bg-warn text-on-accent',
  error: 'bg-alert text-on-accent',
};

/**
 * Toast/snackbar global (blueprint UI §8): slide-up 200ms, auto-dismiss 3s.
 * Dipasang sekali di App.tsx; trigger via `toast.success('...')` dari store.
 */
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex max-w-sm items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium shadow-card-lg animate-[toast-in_200ms_ease-out]',
              STYLES[t.variant],
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
