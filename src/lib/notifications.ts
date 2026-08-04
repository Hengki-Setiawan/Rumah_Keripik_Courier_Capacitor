import { isNative } from './env';
import { apiRequest } from './api-client';
import { getPlatform } from './env';

let registeredToken: string | null = null;

/**
 * Register FCM token ke backend (tabel expoPushTokens).
 * Dipanggil setelah login berhasil dan saat token refresh.
 */
export async function registerPushToken(token: string): Promise<void> {
  if (token === registeredToken) return;
  try {
    await apiRequest('/api/courier/push-tokens', {
      method: 'POST',
      body: JSON.stringify({
        expoPushToken: token,
        platform: getPlatform(),
      }),
    });
    registeredToken = token;
  } catch {
    // gagal register — token tetap dikirim ulang pada inisialisasi berikutnya
  }
}

/**
 * Inisialisasi push notification (FCM).
 * - Minta permission (Android 13+)
 * - Ambil token & register ke backend
 * - Pasang listener tawaran real-time / notifikasi
 * Callback `onOffer` dipanggil saat tawaran pengiriman baru diterima.
 */
export async function initPushNotifications(opts: { onOffer?: (data: { deliveryId?: number | string; assignmentId?: number | string }) => void } = {}): Promise<void> {
  if (!isNative) return;

  const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

  try {
    const perm = await FirebaseMessaging.checkPermissions();
    if (perm.receive === 'prompt') {
      const requested = await FirebaseMessaging.requestPermissions();
      if (requested.receive !== 'granted') return;
    }

    const { token } = await FirebaseMessaging.getToken();
    await registerPushToken(token);

    FirebaseMessaging.addListener('tokenReceived', async (event) => {
      await registerPushToken(event.token);
    });

    FirebaseMessaging.addListener('notificationReceived', (event) => {
      const data = (event.notification.data ?? {}) as Record<string, unknown>;
      if (data && 'offer' in data) {
        opts.onOffer?.({
          deliveryId: data.deliveryId != null ? Number(data.deliveryId) : undefined,
          assignmentId: data.assignmentId != null ? Number(data.assignmentId) : undefined,
        });
      }
    });
  } catch {
    // FCM belum dikonfigurasi (butuh google-services.json) — abaikan diam-diam
  }
}

/**
 * Hapus token FCM dari backend saat logout.
 */
export async function unregisterPushToken(): Promise<void> {
  if (!isNative) return;
  try {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
    await FirebaseMessaging.deleteToken();
  } catch {
    // ignore
  }
  registeredToken = null;
}