import { describe, expect, it } from 'vitest';
import { generatePinSalt, hashPin, isPinHashingAvailable, verifyStoredPin } from '../src/lib/pin-hash';

describe('pin-hash', () => {
  it('menghasilkan salt acak unik setiap panggilan', () => {
    expect(generatePinSalt()).not.toBe(generatePinSalt());
    expect(generatePinSalt()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('hashPin deterministik dengan salt yang sama', async () => {
    if (!isPinHashingAvailable()) return;
    const salt = generatePinSalt();
    const a = await hashPin('123456', salt);
    const b = await hashPin('123456', salt);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hash berbeda untuk PIN berbeda dengan salt sama', async () => {
    if (!isPinHashingAvailable()) return;
    const salt = generatePinSalt();
    const a = await hashPin('123456', salt);
    const b = await hashPin('654321', salt);
    expect(a).not.toBe(b);
  });

  it('verifyStoredPin: benar dengan salt + hash yang cocok', async () => {
    if (!isPinHashingAvailable()) return;
    const salt = generatePinSalt();
    const hash = await hashPin('246810', salt);
    expect(hash).toBeTruthy();
    await expect(verifyStoredPin('246810', hash, salt)).resolves.toBe(true);
    await expect(verifyStoredPin('000000', hash, salt)).resolves.toBe(false);
  });

  it('verifyStoredPin: fallback plaintext untuk PIN lama (tanpa salt)', async () => {
    await expect(verifyStoredPin('123456', '123456', null)).resolves.toBe(true);
    await expect(verifyStoredPin('000000', '123456', null)).resolves.toBe(false);
    await expect(verifyStoredPin('123456', null, null)).resolves.toBe(false);
  });
});