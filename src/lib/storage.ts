import { isNative } from './env';

export const STORAGE_KEYS = {
  accessToken: 'rk.access_token',
  refreshToken: 'rk.refresh_token',
  courierProfile: 'rk.courier_profile',
  deviceId: 'rk.device_id',
  pinEnabled: 'rk.pin_enabled',
  pinCode: 'rk.pin_code',
  themeMode: 'rk.theme_mode',
  lastActiveShift: 'rk.last_active_shift',
  voiceMuted: 'rk.voice_muted',
  voiceEnabled: 'rk.voice_enabled',
  voiceRate: 'rk.voice_rate',
} as const;

// Kunci yang berisi data sensitif (token sesi) — disimpan terenkripsi
// via Android Keystore (capacitor-secure-storage-plugin), bukan Preferences biasa.
// Menyikapi keamanan Capacitor: bundle JS mudah diekstrak, jadi token jangan di localStorage.
const SENSITIVE_KEYS = new Set<string>([
  'rk.access_token',
  'rk.refresh_token',
  'rk.pin_enabled',
  'rk.pin_code',
]);

const memoryStore = new Map<string, string>();

const webStorage = {
  async get(key: string): Promise<string | null> {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memoryStore.set(key, value);
    }
  },
  async remove(key: string): Promise<void> {
    try {
      window.localStorage.removeItem(key);
    } catch {
      memoryStore.delete(key);
    }
  },
};

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (!isNative) return webStorage.get(key);
    if (SENSITIVE_KEYS.has(key)) {
      try {
        const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
        const { value } = await SecureStoragePlugin.get({ key });
        return value ?? null;
      } catch {
        // jatuh ke Preferences biasa bila plugin belum tersinkron
      }
    }
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key });
    return value ?? null;
  },
  async set(key: string, value: string): Promise<void> {
    if (!isNative) return webStorage.set(key, value);
    if (SENSITIVE_KEYS.has(key)) {
      try {
        const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
        await SecureStoragePlugin.set({ key, value });
        return;
      } catch {
        // lanjut ke Preferences bila plugin belum tersinkron
      }
    }
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key, value });
  },
  async remove(key: string): Promise<void> {
    if (!isNative) return webStorage.remove(key);
    if (SENSITIVE_KEYS.has(key)) {
      try {
        const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
        await SecureStoragePlugin.remove({ key });
      } catch {
        // lanjut ke Preferences removal
      }
    }
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key });
  },
};

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await secureStorage.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJson(key: string, value: unknown): Promise<void> {
  await secureStorage.set(key, JSON.stringify(value));
}
