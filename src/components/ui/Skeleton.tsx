import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-[14px] bg-ink-muted/20', className)} aria-hidden />;
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-[20px] bg-raised p-4 shadow-card flex flex-col gap-3', className)}>
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-3.5 w-full" />
    </div>
  );
}