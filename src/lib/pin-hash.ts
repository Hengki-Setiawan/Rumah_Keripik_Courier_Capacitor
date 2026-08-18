// PIN lock hashing: simpan hash SHA-256(salt:pin), bukan PIN plaintext.
// Pakai Web Crypto (tersedia di WebView Android & browser modern). Bila API
// tidak tersedia (mis. konteks non-secure lama), fallback ke plaintext agar
// fitur PIN tetap jalan — SecureStore/Keystore masih mengenkripsi nilainya.

export function isPinHashingAvailable(): boolean {
  try {
    return (
      typeof crypto !== 'undefined' &&
      typeof crypto.getRandomValues === 'function' &&
      typeof crypto.subtle?.digest === 'function'
    );
  } catch {
    return false;
  }
}

export function generatePinSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(digest));
}

/**
 * Menghasilkan hash untuk PIN. Mengembalikan null bila Web Crypto
 * tidak tersedia (kode pemanggil harus memutuskan fallback).
 */
export async function hashPin(pin: string, salt: string): Promise<string | null> {
  if (!isPinHashingAvailable()) return null;
  try {
    return await sha256Hex(`${salt}:${pin}`);
  } catch {
    return null;
  }
}

/**
 * Memverifikasi PIN terhadap nilai tersimpan.
 * - Bila `salt` tersedia: bandingkan hash SHA-256(salt:pin) dengan `stored`.
 * - Selain itu: fallback plaintext (PIN lama dari versi APK sebelumnya).
 */
export async function verifyStoredPin(pin: string, stored: string | null, salt: string | null): Promise<boolean> {
  if (!stored) return false;
  if (salt) {
    const candidate = await hashPin(pin, salt);
    if (candidate) return candidate === stored;
    return stored === pin;
  }
  return stored === pin;
}