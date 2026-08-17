import { create } from 'zustand';
import { STORAGE_KEYS, getJson, secureStorage, setJson } from '@/lib/storage';
import { fetchMe, loginWithPin, logoutRemote } from '@/lib/api-client';
import { initPushNotifications, unregisterPushToken, type PushNotificationOptions } from '@/lib/notifications';
import { setupLiveUpdate } from '@/lib/live-update';
import { startLocationTracking, stopLocationTracking } from '@/lib/background-location';
import { identifyCourier, resetAnalytics, track } from '@/lib/analytics';
import { useOfferStore } from '@/stores/offer-store';
import type { CourierDto } from '@/lib/types';
import { getOrCreateDeviceId } from '@/lib/device';

interface AuthState {
  courier: CourierDto | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  pinEnabled: boolean;
  pinLocked: boolean;
  hasPin: boolean;
  loginError: string | null;
  bootstrap: () => Promise<void>;
  login: (pin: string) => Promise<{ ok: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
  setPinEnabled: (enabled: boolean) => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  lock: () => void;
  setCourier: (c: CourierDto | null) => void;
}

function notifOpts(): PushNotificationOptions {
  return {
    onOffer: (data) => {
      useOfferStore.getState().presentOffer({
        deliveryId: data.deliveryId,
        assignmentId: data.assignmentId,
        receivedAt: new Date().toISOString(),
      });
    },
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  courier: null,
  isAuthenticated: false,
  isBootstrapping: true,
  pinEnabled: false,
  pinLocked: false,
  hasPin: false,
  loginError: null,

  async bootstrap() {
    useOfferStore.setState({ offer: null, busy: false, error: null });
    set({ isBootstrapping: true });
    try {
      const pinEnabled = (await secureStorage.get(STORAGE_KEYS.pinEnabled)) === 'true';
      const hasPin = (await secureStorage.get(STORAGE_KEYS.pinCode)) != null;
      const courier = await getJson<CourierDto>(STORAGE_KEYS.courierProfile);
      const tokens = (await secureStorage.get(STORAGE_KEYS.accessToken)) != null;

      if (tokens && courier) {
        set({ isAuthenticated: true, courier, hasPin, pinEnabled: pinEnabled && hasPin, pinLocked: pinEnabled && hasPin });
        void startLocationTracking().catch(() => undefined);
        fetchMe()
          .then((fresh) => {
            set({ courier: fresh });
            setJson(STORAGE_KEYS.courierProfile, fresh);
            void initPushNotifications(notifOpts());
            void setupLiveUpdate({ courierId: fresh.id });
          })
          .catch(() => {
            void initPushNotifications(notifOpts());
            void setupLiveUpdate({ courierId: courier.id });
          });
      } else {
        set({ isAuthenticated: false, courier: null, hasPin, pinEnabled: pinEnabled && hasPin });
      }
    } finally {
      set({ isBootstrapping: false });
    }
  },

  async login(pin) {
    set({ loginError: null });
    try {
      const deviceId = await getOrCreateDeviceId();
      const result = await loginWithPin(pin, deviceId);
      await secureStorage.set(STORAGE_KEYS.accessToken, result.accessToken);
      await secureStorage.set(STORAGE_KEYS.refreshToken, result.refreshToken);
      await setJson(STORAGE_KEYS.courierProfile, result.courier);
      const pinEnabled = (await secureStorage.get(STORAGE_KEYS.pinEnabled)) === 'true';
      set({ isAuthenticated: true, courier: result.courier, pinEnabled });
      identifyCourier(result.courier.id, { name: result.courier.name });
      track('login_success');
      void startLocationTracking().catch(() => undefined);
      void initPushNotifications(notifOpts());
      void setupLiveUpdate({ courierId: result.courier.id });
      return { ok: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'PIN salah';
      set({ loginError: message });
      track('login_failed', { error: message });
      return { ok: false, error: message };
    }
  },

  async refreshProfile() {
    const fresh = await fetchMe();
    set({ courier: fresh });
    await setJson(STORAGE_KEYS.courierProfile, fresh);
  },

  async logout() {
    await logoutRemote();
    await unregisterPushToken();
    useOfferStore.setState({ offer: null, busy: false, error: null });
    resetAnalytics();
    void stopLocationTracking().catch(() => undefined);
    set({ isAuthenticated: false, courier: null });
  },

  async setPinEnabled(enabled) {
    if (enabled) {
      const existing = (await secureStorage.get(STORAGE_KEYS.pinCode)) != null;
      if (existing) {
        await secureStorage.set(STORAGE_KEYS.pinEnabled, 'true');
        set({ pinEnabled: true });
      }
      return;
    }
    await secureStorage.remove(STORAGE_KEYS.pinCode);
    await secureStorage.set(STORAGE_KEYS.pinEnabled, 'false');
    set({ pinEnabled: false, pinLocked: false, hasPin: false });
  },

  async setPin(pin) {
    await secureStorage.set(STORAGE_KEYS.pinCode, pin);
    await secureStorage.set(STORAGE_KEYS.pinEnabled, 'true');
    set({ pinEnabled: true, pinLocked: false, hasPin: true });
  },

  async verifyPin(pin) {
    const stored = await secureStorage.get(STORAGE_KEYS.pinCode);
    if (!stored) return false;
    const ok = stored === pin;
    if (ok) set({ pinLocked: false });
    return ok;
  },

  lock() {
    set({ pinLocked: true });
  },

  setCourier(c) {
    set({ courier: c });
    if (c) setJson(STORAGE_KEYS.courierProfile, c);
  },
}));