import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

type IconTone = 'brand' | 'info' | 'ok' | 'money' | 'alert';

interface IconBadgeProps {
  icon: LucideIcon;
  tone?: IconTone;
  emphasis?: 'soft' | 'solid-alert';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const TONE_SOFT: Record<IconTone, string> = {
  brand: 'bg-brand-soft text-brand-pressed',
  info: 'bg-info-soft text-info',
  ok: 'bg-ok-soft text-ok',
  money: 'bg-money-soft text-money',
  alert: 'bg-alert-soft text-alert',
};

const SIZE_CLASS: Record<NonNullable<IconBadgeProps['size']>, { box: string; icon: string }> = {
  sm: { box: 'size-8', icon: 'size-4' },
  md: { box: 'size-10', icon: 'size-5' },
  lg: { box: 'size-12', icon: 'size-6' },
};

/**
 * Badge ikon lunak (soft-tint) — bahasa visual default seluruh app.
 * emphasis="solid-alert" hanya untuk aksi darurat/destruktif (SOS, batal).
 */
export function IconBadge({ icon: Icon, tone = 'brand', emphasis = 'soft', className, size = 'md' }: IconBadgeProps) {
  const s = SIZE_CLASS[size];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        s.box,
        emphasis === 'solid-alert' ? 'bg-alert text-on-danger' : TONE_SOFT[tone],
        className,
      )}
    >
      <Icon className={s.icon} strokeWidth={1.8} />
    </span>
  );
}