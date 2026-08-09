import { useState, useRef, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type SnapPoint = 'peek' | 'half' | 'full';

const SNAP_PERCENT: Record<SnapPoint, number> = {
  peek: 75,
  half: 40,
  full: 0,
};

interface BottomSheetProps {
  snap: SnapPoint;
  onSnapChange: (s: SnapPoint) => void;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({ snap, onSnapChange, children, className }: BottomSheetProps) {
  const [dragY, setDragY] = useState<number | null>(null);
  const startY = useRef(0);
  const startSnap = useRef<SnapPoint>('peek');

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      startY.current = e.clientY;
      startSnap.current = snap;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [snap],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const dy = e.clientY - startY.current;
    if (dy > 0 && startSnap.current === 'peek') return;
    setDragY(dy);
  }, []);

  const onPointerUp = useCallback(() => {
    if (dragY == null) return;
    const t = 60;
    const from = startSnap.current;
    let next: SnapPoint = from;
    if (from === 'peek' && dragY < -t) next = 'half';
    else if (from === 'half' && dragY > t) next = 'peek';
    else if (from === 'half' && dragY < -t) next = 'full';
    else if (from === 'full' && dragY > t) next = 'half';
    else if (from === 'full' && dragY > 0) next = 'half';
    setDragY(null);
    if (next !== from) onSnapChange(next);
  }, [dragY, onSnapChange]);

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-[28px] bg-surface shadow-sheet transition-transform duration-300 ease-out border-t border-border-subtle',
        className,
      )}
      style={{ transform: dragY != null ? `translateY(${dragY}px)` : `translateY(${SNAP_PERCENT[snap]}%)` }}
    >
      <div
        className="flex shrink-0 cursor-grab touch-none flex-col items-center py-2.5"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="h-1 w-10 rounded-full bg-ink-muted/30" />
      </div>
      <div className="max-h-[45dvh] overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}