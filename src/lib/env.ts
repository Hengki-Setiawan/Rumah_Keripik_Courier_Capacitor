import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'https://rumah-keripik.vercel.app';
export const API_BASE_URL = API_BASE.replace(/\/+$/, '');

export const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? '';
export const FCM_VAPID_KEY = (import.meta.env.VITE_FCM_VAPID_KEY as string | undefined) ?? '';

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function isWeb() {
  return !isNative;
}

export function getPlatform(): 'android' | 'ios' | 'web' {
  return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
}
