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
  1: 'bg-umber-900/80 border border-umber-700/60',
  2: 'bg-umber-900/90 border border-umber-700 shadow-lg shadow-black/20',
  3: 'bg-umber-900 border border-umber-600/80 shadow-xl shadow-black/30',
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
        'rounded-2xl',
        elevationClasses[elevation],
        paddingClasses[padding],
        interactive && 'cursor-pointer transition-transform active:scale-[0.99] hover:border-amber-600/60',
        className,
      )}
    >
      {children}
    </div>
  );
}