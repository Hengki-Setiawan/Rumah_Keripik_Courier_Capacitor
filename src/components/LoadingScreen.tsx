import { Spinner } from './ui/Button';

export function LoadingScreen({ message = 'Memuat...' }: { message?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-surface">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-brand/10 border border-brand/20 text-brand">
        <Spinner className="size-8" />
      </div>
      <p className="text-sm text-ink-muted">{message}</p>
    </div>
  );
}