import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, RefreshCw } from 'lucide-react';
import { hapticImpact } from '@/lib/haptics';

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

const THRESHOLD = 65;
const RESISTANCE = 0.45;

export function PullToRefresh({ onRefresh, children, disabled, className }: PullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pullRef = useRef(0);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const disabledRef = useRef(disabled);
  const hasTriggeredHaptic = useRef(false);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const applyPull = useCallback((next: number) => {
    pullRef.current = next;
    setPull(next);
  }, []);

  const trigger = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    applyPull(THRESHOLD);
    void hapticImpact('medium');

    try {
      await onRefreshRef.current();
      void hapticImpact('light');
    } catch {
      // Error handled by query/toast
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
      applyPull(0);
      hasTriggeredHaptic.current = false;
    }
  }, [applyPull]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const getScrollTop = () =>
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    const onTouchStart = (e: TouchEvent) => {
      if (disabledRef.current || refreshingRef.current) return;
      if (getScrollTop() > 5) return;
      const t = e.touches[0];
      if (!t) return;
      pulling.current = true;
      startY.current = t.clientY;
      hasTriggeredHaptic.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (disabledRef.current || refreshingRef.current || !pulling.current || startY.current == null) return;
      const t = e.touches[0];
      if (!t) return;
      const dy = t.clientY - startY.current;

      if (dy <= 0 || getScrollTop() > 5) {
        pulling.current = false;
        startY.current = null;
        applyPull(0);
        return;
      }

      const next = Math.min(dy * RESISTANCE, THRESHOLD * 1.6);
      applyPull(next);

      if (next >= THRESHOLD && !hasTriggeredHaptic.current) {
        hasTriggeredHaptic.current = true;
        void hapticImpact('light');
      }

      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      startY.current = null;

      if (!refreshingRef.current && pullRef.current >= THRESHOLD) {
        void trigger();
      } else {
        applyPull(0);
        hasTriggeredHaptic.current = false;
      }
    };

    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('touchmove', onTouchMove, { passive: false });
    root.addEventListener('touchend', onTouchEnd, { passive: true });
    root.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      root.removeEventListener('touchstart', onTouchStart);
      root.removeEventListener('touchmove', onTouchMove);
      root.removeEventListener('touchend', onTouchEnd);
      root.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [applyPull, trigger]);

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div ref={rootRef} className={className}>
      {/* Visual Floating Indicator Capsule */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-12 z-30 flex justify-center transition-transform duration-150 ease-out"
        style={{
          transform: `translateY(${refreshing ? 60 : pull > 10 ? pull * 0.9 : 0}px)`,
          opacity: refreshing || pull > 10 ? 1 : 0,
        }}
        aria-hidden="true"
      >
        <div className="flex size-10 items-center justify-center rounded-2xl border border-white/20 bg-surface/95 shadow-floating backdrop-blur-xl">
          {refreshing ? (
            <RefreshCw className="size-5 text-brand animate-spin" />
          ) : (
            <ArrowDown
              className="size-5 text-brand transition-transform duration-200"
              style={{
                transform: `rotate(${progress >= 1 ? 180 : progress * 180}deg)`,
                opacity: 0.4 + progress * 0.6,
              }}
            />
          )}
        </div>
      </div>

      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: refreshing ? 'translateY(48px)' : `translateY(${pull * 0.6}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
