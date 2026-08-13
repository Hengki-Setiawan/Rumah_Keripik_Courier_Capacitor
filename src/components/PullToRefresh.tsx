import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Spinner } from '@/components/ui/Button';

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

const THRESHOLD = 64;
const RESISTANCE = 0.5;

// Pull-to-refresh berbasis touch event (bukan native), karena app berjalan di
// Capacitor WebView — bukan React Native.
//
// PENTING: React menempelkan touchstart/touchmove sebagai PASSIVE listener di
// root, sehingga e.preventDefault() di handler React TIDAK berfungsi (gesture
// diteruskan ke native scroll/overscroll). Karena itu handler dipasang lewat
// addEventListener native dengan { passive: false } via ref, hanya aktif saat
// scroll di posisi paling atas (scrollY === 0).
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
    try {
      await onRefreshRef.current();
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
      applyPull(0);
    }
  }, [applyPull]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onTouchStart = (e: TouchEvent) => {
      if (disabledRef.current || refreshingRef.current) return;
      // Hanya mulai pull saat sudah berada di posisi paling atas.
      if (window.scrollY > 0) return;
      const t = e.touches[0];
      if (!t) return;
      pulling.current = true;
      startY.current = t.clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (disabledRef.current || refreshingRef.current || !pulling.current || startY.current == null) return;
      const t = e.touches[0];
      if (!t) return;
      const dy = t.clientY - startY.current;
      // Tarik ke atas (scroll normal) — serahkan ke native scroll.
      if (dy <= 0 || window.scrollY > 0) {
        pulling.current = false;
        startY.current = null;
        applyPull(0);
        return;
      }
      const next = Math.min(dy * RESISTANCE, THRESHOLD * 1.5);
      applyPull(next);
      e.preventDefault();
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      startY.current = null;
      if (!refreshingRef.current && pullRef.current >= THRESHOLD) {
        void trigger();
      } else {
        applyPull(0);
      }
    };

    // passive:false → preventDefault() benar-benar menahan scroll/overscroll.
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

  return (
    // touchAction default (auto): browser hanya mengklaim gesture jika benar-
    // benar ada konten yang bisa discroll. Di posisi top, pull ke bawah adalah
    // overscroll yang sudah dimatikan via `overscroll-behavior: none` di body,
    // jadi touchmove tetap diteruskan ke JS tanpa touchcancel prematur.
    <div ref={rootRef} className={className}>
      <div
        className="pointer-events-none absolute inset-x-0 flex justify-center transition-transform duration-200"
        style={{ transform: `translateY(${pull}px)` }}
        aria-hidden="true"
      >
        <div
          className={`mt-1 flex size-9 items-center justify-center rounded-full bg-raised shadow-card border border-border-subtle transition-opacity ${
            refreshing || pull > 0 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Spinner className={`size-5 text-brand ${refreshing ? '' : 'animate-pulse'}`} />
        </div>
      </div>
      <div
        className="transition-transform duration-200"
        style={{ transform: refreshing ? 'translateY(48px)' : `translateY(${pull}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
