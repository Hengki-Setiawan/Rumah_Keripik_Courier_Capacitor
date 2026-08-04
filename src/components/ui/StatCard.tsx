import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type StatTone = 'amber' | 'emerald' | 'red' | 'blue';

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: StatTone;
  hint?: string;
  className?: string;
}

const toneClasses: Record<StatTone, string> = {
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export function StatCard({ label, value, icon, tone = 'amber', hint, className }: StatCardProps) {
  return (
    <div className={cn('rounded-2xl border p-4 flex flex-col gap-3', toneClasses[tone], className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium opacity-80">{label}</span>
        {icon}
      </div>
      <span className="text-2xl font-bold tracking-tight">{value}</span>
      {hint && <span className="text-[11px] opacity-70">{hint}</span>}
    </div>
  );
}