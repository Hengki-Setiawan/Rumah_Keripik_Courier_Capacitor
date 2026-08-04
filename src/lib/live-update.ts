import { isNative } from './env';

/**
 * Live update via @capgo/capacitor-updater.
 * - `notifyAppReady()` WAJIB dipanggil segera di awal JS agar bundle tidak di-rollback.
 * - Update otomatis dikelola native (autoUpdate), kita hanya konfirmasi bundle sehat
 *   dan (opsional) sinkronkan customId kurir untuk target update.
 */
export async function setupLiveUpdate(opts: { courierId?: number | string } = {}): Promise<void> {
  if (!isNative) return;

  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');

    // Konfirmasi bundle berjalan sehat — cegah auto-rollback.
    await CapacitorUpdater.notifyAppReady();

    if (opts.courierId != null) {
      try {
        await CapacitorUpdater.setCustomId({ customId: String(opts.courierId) });
      } catch {
        // customId opsional
      }
    }
  } catch {
    // Capgo belum dikonfigurasi — abaikan
  }
}