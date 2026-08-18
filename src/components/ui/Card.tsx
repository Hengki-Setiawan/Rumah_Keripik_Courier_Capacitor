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
  1: 'bg-surface/90 border border-white/8 shadow-card backdrop-blur-sm',
  2: 'bg-surface/95 border border-white/10 shadow-frameless backdrop-blur-md',
  3: 'bg-surface border border-brand/30 shadow-floating backdrop-blur-lg',
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
        'rounded-3xl transition-all duration-200',
        elevationClasses[elevation],
        paddingClasses[padding],
        interactive && 'cursor-pointer active:scale-[0.985] hover:shadow-card-lg',
        className,
      )}
    >
      {children}
    </div>
  );
}