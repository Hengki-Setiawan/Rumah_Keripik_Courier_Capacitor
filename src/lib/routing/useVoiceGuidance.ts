import { useEffect, useRef } from 'react';
import type { LatLng, RouteLegGeometry } from './types';
import { findUpcomingStep, remainingDistanceToEndM } from './navigation';
import { haversineMeters } from './distance';
import { speak, stopSpeech, buildAnnouncement } from './voice-guide';
import { useVoiceGuideStore } from '@/stores/voice-guide-store';
import { isNative } from '@/lib/env';

interface UseVoiceGuidanceArgs {
  leg: RouteLegGeometry | null;
  position: LatLng | null;
  navigationMode: boolean;
  offRoute: boolean;
  destinationName?: string;
}

const STEP_HOLD_MS = 1500;
const OFF_ROUTE_COOLDOWN_MS = 10_000;

/**
 * Voice guidance saat navigasi aktif. Mengamati step berikutnya via
 * findUpcomingStep() dan mengumumkan instruksi di tiap momen penting:
 * mulai navigasi, pergantian step, mendekati manuver (<50m), tiba, keluar rute.
 */
export function useVoiceGuidance({
  leg,
  position,
  navigationMode,
  offRoute,
  destinationName,
}: UseVoiceGuidanceArgs): void {
  const lastStepIndexRef = useRef<number | null>(null);
  const lastLegKeyRef = useRef<string | null>(null);
  const announcedNearRef = useRef<Set<number>>(new Set());
  const announcedArrivalRef = useRef(false);
  const lastOffRouteAnnounceRef = useRef(0);
  const navWasOnRef = useRef(false);
  const navStartedAtRef = useRef(0);

  // Mulai navigasi: umumkan tujuan sekali + catat waktu mulai (untuk hold step).
  useEffect(() => {
    if (navigationMode && !navWasOnRef.current) {
      announcedArrivalRef.current = false;
      announcedNearRef.current.clear();
      lastStepIndexRef.current = null;
      navStartedAtRef.current = Date.now();
      if (destinationName) {
        void speak(`Mulai navigasi ke ${destinationName}`);
      } else {
        void speak('Mulai navigasi');
      }
    }
    navWasOnRef.current = navigationMode;
  }, [navigationMode, destinationName]);

  // Keluar rute: umumkan sekali per episode (cooldown 10 detik).
  useEffect(() => {
    if (!navigationMode || !offRoute) return;
    const now = Date.now();
    if (now - lastOffRouteAnnounceRef.current < OFF_ROUTE_COOLDOWN_MS) return;
    lastOffRouteAnnounceRef.current = now;
    void speak('Anda keluar dari rute, menghitung ulang');
  }, [navigationMode, offRoute]);

  // Step berikutnya: umumkan saat step berubah atau <50m.
  useEffect(() => {
    if (!navigationMode) return;
    const upcoming = leg && position ? findUpcomingStep(leg, position) : null;
    if (!upcoming) return;
    const { step, distanceM } = upcoming;
    const remainingToEnd = leg && position ? remainingDistanceToEndM(leg, position) : null;
    // Jarak fisik dari posisi GPS ke titik tujuan (koordinat terakhir leg). Ini
    // menangkap kasus kurir ambil pintasan langsung ke stop: jarak sepanjang rute
    // bisa masih besar, tapi fisik sudah dekat titik tujuan.
    const endCoord = leg?.coordinates?.[leg.coordinates.length - 1];
    const physicalToEndM = leg && position && endCoord ? haversineMeters(position, { lat: endCoord[0], lng: endCoord[1] }) : null;
    // 'arrive' hanya dianggap tiba jika memang sudah dekat (<50m). Untuk rute pendek
    // ORS hanya memberi step depart+arrive, sehingga tanpa cek jarak ini suara akan
    // menyebut "sudah sampai tujuan" begitu navigasi dimulai.
    const arrived = (step.modifier === 'arrive' && distanceM < 50) || (remainingToEnd !== null && remainingToEnd < 30) || (physicalToEndM !== null && physicalToEndM < 40);

    // Leg baru (stop lain / reroute): index step dimulai ulang Ã¢â€ â€™ reset ref agar
    // instruksi pertama leg baru tetap diumumkan.
    const legKey = leg?.coordinates?.[0] ? `${leg.coordinates[0][0]},${leg.coordinates[0][1]}` : null;
    if (legKey && legKey !== lastLegKeyRef.current) {
      lastLegKeyRef.current = legKey;
      lastStepIndexRef.current = null;
      announcedNearRef.current.clear();
      announcedArrivalRef.current = false;
    }

    if (arrived) {
      if (!announcedArrivalRef.current) {
        announcedArrivalRef.current = true;
        void speak(destinationName ? `Anda tiba di tujuan, ${destinationName}` : 'Anda tiba di tujuan');
      }
      return;
    }

    announcedArrivalRef.current = false;

    // Tahan pengumuman step selama beberapa saat setelah navigasi mulai,
    // agar pesan "Mulai navigasi ke ..." sempat selesai diputar.
    if (Date.now() - navStartedAtRef.current < STEP_HOLD_MS) return;

    // Step berubah Ã¢â€ â€™ pengumuman lengkap (jarak + instruksi), sekali per step.
    if (lastStepIndexRef.current !== step.index) {
      lastStepIndexRef.current = step.index;
      announcedNearRef.current.clear();
      void speak(
        buildAnnouncement({
          modifier: step.modifier,
          instruction: step.instruction,
          roadName: step.roadName,
          distanceM,
          arrived: false,
        }),
      );
      return;
    }

    // Mendekati manuver (<50m) Ã¢â€ â€™ ulang singkat, sekali per step.
    if (distanceM <= 50 && !announcedNearRef.current.has(step.index)) {
      announcedNearRef.current.add(step.index);
      void speak(
        buildAnnouncement({
          modifier: step.modifier,
          instruction: step.instruction,
          roadName: step.roadName,
          distanceM,
          arrived: false,
        }),
      );
    }
  }, [leg, position, navigationMode, destinationName]);

  // Bersih-bersih saat navigasi mati / unmount.
  useEffect(() => {
    if (navigationMode) return;
    void stopSpeech();
    lastStepIndexRef.current = null;
    announcedNearRef.current.clear();
    lastLegKeyRef.current = null;
  }, [navigationMode]);

  // Keep-awake: layar tidak redup/mati selama navigasi aktif.
  useEffect(() => {
    if (!isNative) return;
    void (async () => {
      try {
        const { KeepAwake } = await import('@capacitor-community/keep-awake');
        if (navigationMode) {
          await KeepAwake.keepAwake();
        } else {
          await KeepAwake.allowSleep();
        }
      } catch {
        // keep-awake best-effort
      }
    })();
  }, [navigationMode]);

  // Inisialisasi store saat mount (agar setting tersimpan ikut terbaca).
  useEffect(() => {
    void useVoiceGuideStore.getState().init();
  }, []);
}
