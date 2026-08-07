import { create } from 'zustand';
import { STORAGE_KEYS, secureStorage } from '@/lib/storage';
import type { ThemeMode } from '@/tokens/semantic';

interface ThemeState {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => Promise<void>;
  toggle: () => Promise<void>;
}

function applyMode(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'light',

  async setMode(mode) {
    applyMode(mode);
    set({ mode });
    await secureStorage.set(STORAGE_KEYS.themeMode, mode);
  },

  async toggle() {
    await get().setMode(get().mode === 'dark' ? 'light' : 'dark');
  },
}));

export async function initTheme(): Promise<ThemeMode> {
  const stored = await secureStorage.get(STORAGE_KEYS.themeMode);
  // Default light ("Kripik Fresh") — dark mode fallback to stored if user pinned it.
  const mode: ThemeMode = stored === 'dark' ? 'dark' : 'light';
  applyMode(mode);
  useThemeStore.setState({ mode });
  return mode;
}