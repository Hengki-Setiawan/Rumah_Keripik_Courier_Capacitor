// Stub untuk firebase/messaging (web-only, tidak dipakai di native).
export function isSupported(): Promise<boolean> {
  return Promise.resolve(false);
}

export function getMessaging(): void {
  throw new Error('firebase/messaging web is not supported in this app');
}

export async function getToken(): Promise<string> {
  throw new Error('firebase/messaging web is not supported in this app');
}

export async function deleteToken(): Promise<void> {
  throw new Error('firebase/messaging web is not supported in this app');
}

export function onMessage(): void {
  throw new Error('firebase/messaging web is not supported in this app');
}
