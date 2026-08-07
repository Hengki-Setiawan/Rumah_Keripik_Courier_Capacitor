import type { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-brand-soft text-brand-pressed">{icon}</div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="text-sm text-ink-secondary max-w-[240px]">{description}</p>}
      {actionLabel && onAction && <Button variant="secondary" size="sm" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}