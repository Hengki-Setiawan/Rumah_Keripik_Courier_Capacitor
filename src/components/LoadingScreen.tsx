import { Spinner } from './ui/Button';

export function LoadingScreen({ message = 'Memuat...' }: { message?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-umber-950">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
        <Spinner className="size-8" />
      </div>
      <p className="text-sm text-umber-400">{message}</p>
    </div>
  );
}