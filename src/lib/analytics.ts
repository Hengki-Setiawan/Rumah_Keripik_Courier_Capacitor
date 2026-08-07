import { posthog } from 'posthog-js';
import { getPlatform } from './env';

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com';

export function initAnalytics(): void {
  if (!KEY) return;
  if (posthog.__loaded) return;

  posthog.init(KEY, {
    api_host: HOST,
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage',
    advanced_disable_decide: false,
    disable_session_recording: false,
  });
  posthog.register({ platform: getPlatform() });
}

export function identifyCourier(courierId: number | string, properties?: Record<string, unknown>): void {
  if (!KEY) return;
  posthog.identify(String(courierId), properties);
}

export function resetAnalytics(): void {
  if (!KEY) return;
  posthog.reset();
}

export function track(event: string, properties?: Record<string, unknown>): void {
  if (!KEY) return;
  posthog.capture(event, properties);
}

export function captureNetworkError(method: string, path: string, status: number, message: string): void {
  track('api_error', {
    method,
    path,
    status,
    message,
  });
}

export function isAnalyticsEnabled(): boolean {
  return Boolean(KEY);
}
