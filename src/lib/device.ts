import { STORAGE_KEYS, secureStorage } from './storage';

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await secureStorage.get(STORAGE_KEYS.deviceId);
  if (existing) return existing;

  const id = `RK-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await secureStorage.set(STORAGE_KEYS.deviceId, id);
  return id;
}

export async function getDeviceId(): Promise<string | null> {
  return secureStorage.get(STORAGE_KEYS.deviceId);
}
