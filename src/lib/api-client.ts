import { apiUrl, isNative } from './env';
import { STORAGE_KEYS, secureStorage, getJson } from './storage';
import type { CourierDto } from './types';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

let authHeaderOverride: string | null = null;

export function setAuthHeader(token: string | null) {
  authHeaderOverride = token;
}

async function requestNative(path: string, init: RequestInit): Promise<Response> {
  const { CapacitorHttp } = await import('@capacitor/core');
  const headers: Record<string, string> = {};
  const sourceHeaders = new Headers(init.headers || {});
  sourceHeaders.forEach((value, key) => {
    headers[key] = value;
  });

  const res = await CapacitorHttp.request({
    url: apiUrl(path),
    method: (init.method ?? 'GET') as 'GET',
    headers,
    data: init.body ? JSON.parse(init.body as string) : undefined,
    readTimeout: 30_000,
    connectTimeout: 30_000,
  });

  const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? null);
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function apiRequest<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  let token = authHeaderOverride;
  if (auth && !token) {
    token = await secureStorage.get(STORAGE_KEYS.accessToken);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  // Body bisa berupa string JSON (lama) MAUPUN objek mentah. JANGAN double-encode:
  // jika sudah string, kirim apa adanya; jika objek, stringify sekali.
  const initBody = body != null ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined;
  const init: RequestInit = {
    method,
    headers,
    body: initBody,
  };

  let response: Response;
  if (isNative) {
    response = await requestNative(path, init);
  } else {
    response = await fetch(apiUrl(path), init);
  }

  let data: unknown = null;
  const raw = await response.text();
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : null) ??
      `HTTP ${response.status}`;
    if (response.status === 401 && auth) {
      const refreshed = await tryRefreshToken();
      if (refreshed) return apiRequest<T>(path, options);
    }
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = await secureStorage.get(STORAGE_KEYS.refreshToken);
  if (!refreshToken) return false;

  try {
    const res = await fetch(apiUrl('/api/courier/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      await clearAuth();
      return false;
    }
    const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
    if (data.accessToken && data.refreshToken) {
      await secureStorage.set(STORAGE_KEYS.accessToken, data.accessToken);
      await secureStorage.set(STORAGE_KEYS.refreshToken, data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function clearAuth(): Promise<void> {
  await secureStorage.remove(STORAGE_KEYS.accessToken);
  await secureStorage.remove(STORAGE_KEYS.refreshToken);
  setAuthHeader(null);
}

export async function loginWithPin(pin: string, deviceId?: string): Promise<{ accessToken: string; refreshToken: string; courier: CourierDto }> {
  const res = await apiRequest<{ ok: boolean; accessToken?: string; refreshToken?: string; courier?: CourierDto; error?: string }>(
    '/api/courier/auth/login',
    { method: 'POST', auth: false, body: { pin, deviceId } },
  );
  if (!res.ok || !res.accessToken || !res.refreshToken || !res.courier) {
    throw new ApiError(401, res.error || 'Login gagal');
  }
  return { accessToken: res.accessToken, refreshToken: res.refreshToken, courier: res.courier };
}

export async function fetchMe(): Promise<CourierDto> {
  const res = await apiRequest<{ ok: boolean; courier?: CourierDto; error?: string }>('/api/courier/auth/me');
  if (!res.ok || !res.courier) throw new ApiError(401, res.error || 'Sesi tidak valid');
  return res.courier;
}

export async function logoutRemote(): Promise<void> {
  try {
    await apiRequest('/api/courier/auth/logout', { method: 'POST' });
  } catch {
    // ignore — clear local regardless
  }
  await clearAuth();
}

export async function getTokens(): Promise<AuthTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    secureStorage.get(STORAGE_KEYS.accessToken),
    secureStorage.get(STORAGE_KEYS.refreshToken),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export { getJson };
