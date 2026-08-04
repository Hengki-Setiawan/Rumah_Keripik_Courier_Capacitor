import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CollapsingHeaderProps {
  /** Konten besar (avatar + nama + badge) yang mengecil saat scroll. */
  children: ReactNode;
  /** Judul ringkas yang tampil saat collapsed. */
  collapsedTitle: ReactNode;
  /** Scroll threshold (px) sebelum header mengecil. */
  threshold?: number;
  className?: string;
}

/**
 * Header yang mengecil mengikuti scroll (pola "collapsing header" blueprint
 * COURIER_UI_CSS_OVERHAUL V.9) — implementasi web-native via scroll listener
 * + CSS transition, tanpa library animasi.
 */
export function CollapsingHeader({ children, collapsedTitle, threshold = 48, className }: CollapsingHeaderProps) {
  const [collapsed, setCollapsed] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        setCollapsed(window.scrollY > threshold);
        ticking.current = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return (
    <div
      className={cn(
        'sticky top-[65px] z-20 -mx-4 px-4 transition-all duration-300',
        collapsed ? 'translate-y-0 py-2' : 'py-0',
        className,
      )}
    >
      {collapsed ? (
        <div className="flex items-center gap-3 rounded-2xl border border-umber-700/60 bg-umber-950/95 px-4 py-2.5 backdrop-blur-lg">
          {collapsedTitle}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
