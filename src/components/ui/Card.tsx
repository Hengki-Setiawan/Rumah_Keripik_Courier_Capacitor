import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  elevation?: 1 | 2 | 3;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onClick?: () => void;
}

const elevationClasses: Record<1 | 2 | 3, string> = {
  1: 'bg-raised shadow-card',
  2: 'bg-raised shadow-card-lg',
  3: 'bg-raised shadow-card-lg ring-1 ring-brand/20',
};

const paddingClasses: Record<'none' | 'sm' | 'md' | 'lg', string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({ children, className, elevation = 1, padding = 'md', interactive, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-[20px]',
        elevationClasses[elevation],
        paddingClasses[padding],
        interactive && 'cursor-pointer transition-all duration-150 active:scale-[0.99] active:shadow-xs hover:shadow-card-lg',
        className,
      )}
    >
      {children}
    </div>
  );
}