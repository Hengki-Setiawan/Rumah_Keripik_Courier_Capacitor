import { create } from 'zustand';
import { STORAGE_KEYS, secureStorage } from '@/lib/storage';

interface VoiceGuideState {
  enabled: boolean;
  muted: boolean;
  rate: number;
  init: () => Promise<void>;
  setEnabled: (v: boolean) => Promise<void>;
  setMuted: (v: boolean) => Promise<void>;
  setRate: (r: number) => Promise<void>;
  toggleMuted: () => Promise<void>;
}

export const useVoiceGuideStore = create<VoiceGuideState>((set, get) => ({
  enabled: true,
  muted: false,
  rate: 1,

  async init() {
    const enabled = await secureStorage.get(STORAGE_KEYS.voiceEnabled);
    const muted = await secureStorage.get(STORAGE_KEYS.voiceMuted);
    const rate = await secureStorage.get(STORAGE_KEYS.voiceRate);
    set({
      enabled: enabled === null ? true : enabled === 'true',
      muted: muted === 'true',
      rate: rate ? Math.min(1.5, Math.max(0.5, Number(rate) || 1)) : 1,
    });
  },

  async setEnabled(v) {
    set({ enabled: v });
    await secureStorage.set(STORAGE_KEYS.voiceEnabled, String(v));
  },

  async setMuted(v) {
    set({ muted: v });
    await secureStorage.set(STORAGE_KEYS.voiceMuted, String(v));
  },

  async setRate(r) {
    set({ rate: r });
    await secureStorage.set(STORAGE_KEYS.voiceRate, String(r));
  },

  async toggleMuted() {
    await get().setMuted(!get().muted);
  },
}));
