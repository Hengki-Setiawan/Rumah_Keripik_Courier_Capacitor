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
      <div className="flex size-14 items-center justify-center rounded-2xl bg-umber-800 text-umber-400">{icon}</div>
      <h3 className="text-base font-semibold text-umber-100">{title}</h3>
      {description && <p className="text-sm text-umber-400 max-w-xs">{description}</p>}
      {actionLabel && onAction && <Button variant="secondary" size="sm" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}