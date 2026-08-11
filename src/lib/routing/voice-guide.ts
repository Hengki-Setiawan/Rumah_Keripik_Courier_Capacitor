import type { ManeuverModifier } from './types';
import { maneuverToDisplay } from './navigation';
import { isNative } from '@/lib/env';
import { useVoiceGuideStore } from '@/stores/voice-guide-store';

// QueueStrategy.Flush (0): pengumuman baru memotong yang sedang berjalan.
const FLUSH = 0;

let voiceIndexRef: number | null = null;
let voiceLangRef: string | null = null;
let voiceResolvedRef = false;

const ID_CANDIDATES = ['id-ID', 'id', 'in-ID', 'in'];

/**
 * Pilih voice id-ID (prefer engine Google). Hasil hanya di-cache bila daftar
 * voice non-kosong (engine sudah siap); bila kosong, fallback sementara agar
 * panggilan berikutnya bisa mencoba lagi.
 */
async function resolveVoice(): Promise<{ lang: string; voice?: number }> {
  if (voiceResolvedRef) {
    return voiceIndexRef !== null && voiceLangRef
      ? { lang: voiceLangRef, voice: voiceIndexRef }
      : { lang: voiceLangRef ?? 'id' };
  }

  const { TextToSpeech } = await import('@capacitor-community/text-to-speech');

  try {
    const { voices } = await TextToSpeech.getSupportedVoices();
    if (voices.length > 0) {
      // Nama asli engine (mis. "Google 1:1 ...") ada di voiceURI, bukan name
      // (name plugin diisi "Indonesian Indonesia").
      const googleId = voices.findIndex(
        (v) => ID_CANDIDATES.includes(v.lang) && /google/i.test(v.voiceURI),
      );
      const target = googleId >= 0 ? googleId : voices.findIndex((v) => ID_CANDIDATES.includes(v.lang));
      if (target >= 0) {
        voiceIndexRef = target;
        voiceLangRef = voices[target].lang;
        voiceResolvedRef = true;
        return { lang: voices[target].lang, voice: target };
      }
      // Voice id tak ada tapi engine siap: pakai bahasa 'id', cache agar stabil.
      voiceLangRef = 'id';
      voiceResolvedRef = true;
      return { lang: 'id' };
    }
  } catch {
    // lanjut ke fallback bahasa
  }

  // Engine belum siap / gagal: jangan cache, fallback sementara.
  return { lang: 'id' };
}

/** Bicara teks via TTS native. No-op saat non-native / dimatikan / dibisukan. */
export async function speak(text: string): Promise<void> {
  const { enabled, muted, rate } = useVoiceGuideStore.getState();
  if (!isNative || !enabled || muted) return;

  const trySpeak = async (): Promise<void> => {
    const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
    const { lang, voice } = await resolveVoice();
    await TextToSpeech.speak({
      text,
      lang,
      rate,
      pitch: 1,
      volume: 1,
      voice,
      queueStrategy: FLUSH,
    });
  };

  try {
    await trySpeak();
  } catch {
    // Plugin reject saat TTS belum initialized — retry sekali setelah jeda.
    try {
      await new Promise((r) => setTimeout(r, 350));
      await trySpeak();
    } catch {
      // TTS best-effort — jangan gagalkan alur navigasi
    }
  }
}

export async function stopSpeech(): Promise<void> {
  if (!isNative) return;
  try {
    const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
    await TextToSpeech.stop();
  } catch {
    // ignore
  }
}

/** Format jarak untuk diucapkan (bukan untuk layar): "300 meter", "1,5 kilometer". */
export function formatSpeechDistance(m: number): string {
  if (m < 1000) return `${Math.max(1, Math.round(m))} meter`;
  return `${(m / 1000).toFixed(1).replace('.', ' koma ')} kilometer`;
}

export interface AnnouncementInput {
  modifier: ManeuverModifier;
  instruction: string;
  roadName: string;
  distanceM: number;
  arrived: boolean;
}

/**
 * Susun kalimat pengumuman. ORS sudah kirim instruksi bahasa Indonesia via
 * `language: 'id'` — dipakai langsung. OSRM (tanpa teks) dibangun dari label
 * manuver yang sudah Indonesia.
 */
export function buildAnnouncement({ modifier, instruction, roadName, distanceM, arrived }: AnnouncementInput): string {
  if (arrived) return 'Anda tiba di tujuan';

  const label = maneuverToDisplay(modifier).label;
  const road = roadName ? ` ke ${roadName}` : '';
  const short = distanceM <= 50;

  if (instruction.trim()) {
    // ORS: instruksi lengkap Indonesia, mis. "Belok kiri ke Jl. Sudirman".
    // Ulang singkat bila sudah dekat agar tidak terbaca dua kali.
    return short ? `${label} sebentar lagi` : `Dalam ${formatSpeechDistance(distanceM)}, ${instruction.toLowerCase()}`;
  }

  return short ? `${label}${road} sebentar lagi` : `Dalam ${formatSpeechDistance(distanceM)}, ${label.toLowerCase()}${road}`;
}
