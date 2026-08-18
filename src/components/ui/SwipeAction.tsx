import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { hapticImpact, hapticNotification } from '@/lib/haptics';
import { sound } from '@/lib/sound';

interface SwipeActionProps {
  label: string;
  onComplete: () => Promise<void> | void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'brand' | 'success' | 'alert';
  className?: string;
}

const variantStyles = {
  brand: {
    track: 'bg-brand/15 text-brand',
    fill: 'bg-gradient-to-r from-brand/80 to-brand',
    thumb: 'bg-brand text-on-accent shadow-[0_4px_16px_rgba(197,90,43,0.5)]',
    border: 'border-brand/30',
  },
  success: {
    track: 'bg-ok/15 text-ok',
    fill: 'bg-gradient-to-r from-ok/80 to-ok',
    thumb: 'bg-ok text-on-accent shadow-[0_4px_16px_rgba(141,179,74,0.5)]',
    border: 'border-ok/30',
  },
  alert: {
    track: 'bg-alert/15 text-alert',
    fill: 'bg-gradient-to-r from-alert/80 to-alert',
    thumb: 'bg-alert text-on-danger shadow-[0_4px_16px_rgba(220,38,38,0.5)]',
    border: 'border-alert/30',
  },
};

export function SwipeAction({
  label,
  onComplete,
  loading = false,
  disabled = false,
  variant = 'brand',
  className,
}: SwipeActionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const startX = useRef(0);
  const v = variantStyles[variant];

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || loading || isCompleted) return;
    setIsDragging(true);
    startX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    void hapticImpact('light');
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const maxDrag = containerWidth - 56; // 56px is thumb width + padding
    const delta = Math.max(0, Math.min(maxDrag, e.clientX - startX.current));
    setDragX(delta);
  };

  const handlePointerUp = useCallback(async () => {
    if (!isDragging || !containerRef.current) return;
    setIsDragging(false);

    const containerWidth = containerRef.current.clientWidth;
    const maxDrag = containerWidth - 56;
    const threshold = maxDrag * 0.85; // 85% to trigger

    if (dragX >= threshold) {
      setDragX(maxDrag);
      setIsCompleted(true);
      sound.playVictoryChime();
      await hapticImpact('heavy');
      await hapticNotification('success');
      try {
        await onComplete();
      } catch {
        setIsCompleted(false);
        setDragX(0);
      }
    } else {
      // Spring back
      setDragX(0);
    }
  }, [isDragging, dragX, onComplete]);

  // Reset when disabled changes
  useEffect(() => {
    if (!loading && !disabled && isCompleted) {
      const t = setTimeout(() => {
        setIsCompleted(false);
        setDragX(0);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [loading, disabled, isCompleted]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex h-14 w-full select-none items-center overflow-hidden rounded-2xl border p-1 shadow-card transition-all touch-none',
        v.track,
        v.border,
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      {/* Background Fill Track */}
      <div
        className={cn('absolute inset-y-0 left-0 rounded-xl transition-all duration-75', v.fill)}
        style={{
          width: `calc(${dragX}px + 52px)`,
          opacity: dragX > 5 ? 0.35 + (dragX / 200) * 0.4 : 0,
        }}
      />

      {/* Shimmering Center Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className={cn(
            'text-sm font-bold tracking-wide transition-opacity duration-150',
            dragX > 40 ? 'opacity-20' : 'opacity-90',
            isCompleted && 'opacity-0',
          )}
        >
          {loading ? 'Memproses...' : label}
        </span>
      </div>

      {/* Draggable Thumb Button */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ transform: `translateX(${dragX}px)` }}
        className={cn(
          'relative z-10 flex size-12 cursor-grab items-center justify-center rounded-xl font-bold transition-transform active:cursor-grabbing',
          !isDragging && 'transition-transform duration-200 ease-out',
          v.thumb,
        )}
      >
        {isCompleted ? (
          <Check className="size-6 animate-bounce text-on-accent" />
        ) : loading ? (
          <div className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <ChevronRight className="size-6 animate-pulse" />
        )}
      </div>
    </div>
  );
}
