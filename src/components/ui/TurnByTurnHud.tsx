import { useEffect, useRef } from 'react';
import { ArrowUp, MapPin, RotateCw, Volume2, VolumeX } from 'lucide-react';
import type { LatLng, RouteLegGeometry } from '@/lib/routing/types';
import { findUpcomingStep, formatMeters, maneuverToDisplay, remainingDistanceToEndM } from '@/lib/routing/navigation';
import { haversineMeters } from '@/lib/routing/distance';
import { hapticImpact, hapticVibrate } from '@/lib/haptics';
import { useVoiceGuideStore } from '@/stores/voice-guide-store';
import { cn } from '@/lib/cn';

interface TurnByTurnHudProps {
  leg: RouteLegGeometry | null;
  position: LatLng | null;
  className?: string;
}

const VIBRATE_AT_M = 120;

/**
 * Banner manuver besar ala Google Maps (tanpa SDK): panah arah + nama jalan +
 * jarak menuju manuver berikutnya. Bergetar saat mendekati belokan.
 */
export function TurnByTurnHud({ leg, position, className }: TurnByTurnHudProps) {
  const upcoming = leg && position ? findUpcomingStep(leg, position) : null;
  const vibratedStepRef = useRef<number | null>(null);
  const muted = useVoiceGuideStore((s) => s.muted);
  const toggleMuted = useVoiceGuideStore((s) => s.toggleMuted);

  useEffect(() => {
    if (!upcoming) return;
    const { step, distanceM } = upcoming;
    const display = maneuverToDisplay(step.modifier);
    if (!display.vibrate) return;
    if (distanceM >= VIBRATE_AT_M) {
      vibratedStepRef.current = null;
      return;
    }
    if (vibratedStepRef.current === step.index) return;
    vibratedStepRef.current = step.index;
    void hapticVibrate();
    void hapticImpact('heavy');
  }, [upcoming]);

  if (!upcoming) return null;

  const display = maneuverToDisplay(upcoming.step.modifier);
  const remainingToEnd = leg && position ? remainingDistanceToEndM(leg, position) : null;
  const endCoord = leg?.coordinates?.[leg.coordinates.length - 1];
  const physicalToEndM = leg && position && endCoord ? haversineMeters(position, { lat: endCoord[0], lng: endCoord[1] }) : null;
  const arrived = (upcoming.step.modifier === 'arrive' && upcoming.distanceM < 50) || (remainingToEnd !== null && remainingToEnd < 30) || (physicalToEndM !== null && physicalToEndM < 40);
  const Icon = arrived ? MapPin : display.rotationDeg === 180 ? RotateCw : ArrowUp;

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+4.375rem)] z-10 flex items-center gap-3 rounded-2xl bg-surface/95 px-4 py-3 shadow-card backdrop-blur',
        className,
      )}
    >
      <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-on-accent shadow-card">
        <Icon className="size-7" style={display.rotationDeg !== 180 ? { transform: `rotate(${display.rotationDeg}deg)` } : undefined} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{display.label}</p>
        {!arrived && upcoming.step.roadName && (
          <p className="truncate text-xs text-ink-secondary">ke {upcoming.step.roadName}</p>
        )}
        <p className="text-xs font-semibold text-brand">
          {arrived ? 'Sebentar lagi tiba' : `${display.label} dalam ${formatMeters(upcoming.distanceM)}`}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void toggleMuted()}
        aria-label={muted ? 'Aktifkan suara' : 'Bisukan suara'}
        className="pointer-events-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink-secondary transition-colors active:bg-ink/10"
      >
        {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>
    </div>
  );
}
