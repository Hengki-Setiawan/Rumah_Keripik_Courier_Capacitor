import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('shimmer-wave rounded-2xl bg-raised/80', className)} aria-hidden />;
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-3xl border border-white/8 bg-surface/80 p-4 shadow-card flex flex-col gap-3', className)}>
      <Skeleton className="size-10 rounded-2xl" />
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}