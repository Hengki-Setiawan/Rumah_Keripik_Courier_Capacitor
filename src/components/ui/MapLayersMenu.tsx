import { useState, useRef, useEffect } from 'react';
import { Layers, Route as RouteIcon, Timer, Navigation, LocateFixed, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { hapticImpact } from '@/lib/haptics';

interface MapLayersMenuProps {
  showAllRoutes: boolean;
  onToggleAllRoutes: () => void;
  showIsochrones: boolean;
  onToggleIsochrones: () => void;
  activeCoords?: { lat: number; lng: number } | null;
  onOpenExternalNavigation?: (lat: number, lng: number) => void;
  onRecenterLocation?: () => void;
  className?: string;
}

export function MapLayersMenu({
  showAllRoutes,
  onToggleAllRoutes,
  showIsochrones,
  onToggleIsochrones,
  activeCoords,
  onOpenExternalNavigation,
  onRecenterLocation,
  className,
}: MapLayersMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  const toggleOpen = () => {
    void hapticImpact('light');
    setOpen((prev) => !prev);
  };

  return (
    <div ref={menuRef} className={cn('relative pointer-events-auto', className)}>
      {/* 1 Single Floating Action Trigger Button */}
      <button
        onClick={toggleOpen}
        aria-label="Menu Kontrol Peta"
        className={cn(
          'flex size-12 items-center justify-center rounded-2xl border shadow-floating backdrop-blur-2xl transition-all active:scale-90',
          open
            ? 'bg-brand text-on-accent border-brand shadow-[0_4px_16px_rgba(197,90,43,0.5)]'
            : 'bg-surface/90 text-ink border-white/15 hover:bg-raised',
          (showAllRoutes || showIsochrones) && !open && 'ring-2 ring-brand/60',
        )}
      >
        {open ? <X className="size-6" /> : <Layers className="size-6" />}
      </button>

      {/* Popover Glass Menu */}
      {open && (
        <div className="absolute right-0 top-14 z-50 w-64 overflow-hidden rounded-3xl border border-white/15 bg-surface/95 p-3 shadow-floating backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-border-subtle/50">
            <p className="text-[11px] font-extrabold text-ink-muted uppercase tracking-wider">
              Kontrol Navigasi & Layer
            </p>
          </div>

          <div className="mt-2 flex flex-col gap-1.5">
            {/* 1. Recenter GPS Location */}
            {onRecenterLocation && (
              <button
                onClick={() => {
                  void hapticImpact('light');
                  onRecenterLocation();
                  setOpen(false);
                }}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-xs font-bold text-ink hover:bg-raised transition-all active:scale-95 text-left"
              >
                <div className="flex size-8 items-center justify-center rounded-xl bg-brand-soft text-brand-pressed">
                  <LocateFixed className="size-4" />
                </div>
                <div>
                  <p>Posisi GPS Saya</p>
                  <p className="text-[10px] font-normal text-ink-muted">Pusatkan peta ke lokasi kurir</p>
                </div>
              </button>
            )}

            {/* 2. Open External Google Maps */}
            {activeCoords && onOpenExternalNavigation && (
              <button
                onClick={() => {
                  void hapticImpact('medium');
                  onOpenExternalNavigation(activeCoords.lat, activeCoords.lng);
                  setOpen(false);
                }}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-xs font-bold text-brand-pressed bg-brand-soft border border-brand/20 hover:bg-brand-soft/80 transition-all active:scale-95 text-left"
              >
                <div className="flex size-8 items-center justify-center rounded-xl bg-brand text-on-accent shadow-sm">
                  <Navigation className="size-4" />
                </div>
                <div className="flex-1">
                  <p>Buka di Google Maps</p>
                  <p className="text-[10px] font-normal text-brand-pressed/80">Panduan suara belokan aktif</p>
                </div>
                <ExternalLink className="size-3.5 text-brand-pressed/70" />
              </button>
            )}

            {/* 3. Toggle All Routes */}
            <button
              onClick={() => {
                void hapticImpact('light');
                onToggleAllRoutes();
              }}
              className={cn(
                'flex items-center justify-between rounded-2xl px-3 py-2.5 text-xs font-bold transition-all active:scale-95',
                showAllRoutes
                  ? 'bg-brand/15 text-brand-pressed border border-brand/30'
                  : 'text-ink hover:bg-raised border border-transparent',
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex size-8 items-center justify-center rounded-xl',
                  showAllRoutes ? 'bg-brand text-on-accent' : 'bg-raised text-ink-muted'
                )}>
                  <RouteIcon className="size-4" />
                </div>
                <span>Tampilkan Seluruh Rute</span>
              </div>
              <span
                className={cn(
                  'size-2.5 rounded-full ring-2 ring-surface',
                  showAllRoutes ? 'bg-brand' : 'bg-ink-muted/30',
                )}
              />
            </button>

            {/* 4. Toggle Isochrones (Zona Waktu) */}
            <button
              onClick={() => {
                void hapticImpact('light');
                onToggleIsochrones();
              }}
              className={cn(
                'flex items-center justify-between rounded-2xl px-3 py-2.5 text-xs font-bold transition-all active:scale-95',
                showIsochrones
                  ? 'bg-brand/15 text-brand-pressed border border-brand/30'
                  : 'text-ink hover:bg-raised border border-transparent',
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex size-8 items-center justify-center rounded-xl',
                  showIsochrones ? 'bg-brand text-on-accent' : 'bg-raised text-ink-muted'
                )}>
                  <Timer className="size-4" />
                </div>
                <span>Zona Waktu Tempuh</span>
              </div>
              <span
                className={cn(
                  'size-2.5 rounded-full ring-2 ring-surface',
                  showIsochrones ? 'bg-brand' : 'bg-ink-muted/30',
                )}
              />
            </button>

            {/* 5. Ganti / Pilih Jalur Baru */}
            <div className="mt-1 pt-1.5 border-t border-border-subtle/50">
              <button
                onClick={() => {
                  void hapticImpact('light');
                  setOpen(false);
                  navigate('/route-picker');
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold text-ink-secondary hover:text-ink hover:bg-raised transition-colors"
              >
                <span>Pilih / Ganti Jalur Pengiriman</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
