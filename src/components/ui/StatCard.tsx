import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type StatTone = 'amber' | 'emerald' | 'red' | 'blue' | 'money';

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: StatTone;
  hint?: string;
  className?: string;
}

const toneClasses: Record<StatTone, { chip: string; text: string }> = {
  amber: { chip: 'bg-brand-soft text-brand-pressed', text: 'text-brand-pressed' },
  emerald: { chip: 'bg-ok-soft text-ok', text: 'text-ok' },
  red: { chip: 'bg-alert-soft text-alert', text: 'text-alert' },
  blue: { chip: 'bg-info-soft text-info', text: 'text-info' },
  money: { chip: 'bg-money-soft text-money', text: 'text-money' },
};

export function StatCard({ label, value, icon, tone = 'amber', hint, className }: StatCardProps) {
  const t = toneClasses[tone];
  return (
    <div className={cn('rounded-[20px] bg-raised p-4 flex flex-col gap-3 shadow-card', className)}>
      <div className={cn('flex size-10 items-center justify-center rounded-full', t.chip, t.text)}>{icon}</div>
      <div>
        <span className="text-2xl font-bold tracking-tight tabular-nums text-ink">{value}</span>
        <p className="truncate mt-0.5 text-sm text-ink-secondary">{label}</p>
        {/* Slot caption tingginya SELALU dicadangkan supaya grid 2x2 rata terlepas dari
            kartu yang punya hint vs tidak (R4.1.2). */}
        <p className="min-h-[1.1rem] text-[11px] text-ink-muted">{hint ?? '\u00A0'}</p>
      </div>
    </div>
  );
}