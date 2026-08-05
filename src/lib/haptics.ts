import { isNative } from './env';

export type HapticStyle = 'light' | 'medium' | 'heavy';
export type HapticNotificationType = 'success' | 'warning' | 'error';

export async function hapticImpact(style: HapticStyle = 'medium'): Promise<void> {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle[style.toUpperCase() as keyof typeof ImpactStyle] });
  } catch {
    // haptics best-effort — jangan gagalkan alur utama
  }
}

export async function hapticNotification(type: HapticNotificationType = 'success'): Promise<void> {
  if (!isNative) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType[type.toUpperCase() as keyof typeof NotificationType] });
  } catch {
    // haptics best-effort
  }
}

export async function hapticVibrate(): Promise<void> {
  if (!isNative) return;
  try {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.vibrate({ duration: 300 });
  } catch {
    // haptics best-effort
  }
}
