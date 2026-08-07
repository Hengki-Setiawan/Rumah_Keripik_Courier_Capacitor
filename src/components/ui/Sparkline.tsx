import { useId } from 'react';
import { globalTokens } from '@/tokens/global';

const BRAND = globalTokens.amber[500];

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({ values, width = 280, height = 48, className }: SparklineProps) {
  const gradientId = useId();

  if (values.length < 2) {
    return (
      <div className={className} style={{ width, height }} aria-hidden>
        <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border-subtle text-[10px] text-ink-muted">
          Data tren belum tersedia
        </div>
      </div>
    );
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - 6 - ((v - min) / span) * (height - 14);
    return [x, y] as const;
  });

  const line = points.map(([x, y]) => `${x},${y}`).join(' ');
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} width={width} height={height} role="img" aria-label="Tren pendapatan 7 hari">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND} stopOpacity="0.3" />
          <stop offset="100%" stopColor={BRAND} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline points={line} fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === points.length - 1 ? 3 : 2} fill={BRAND} />
      ))}
    </svg>
  );
}