import { describe, it, expect } from 'vitest';
import { backoffDelayMs } from '@/lib/sync/offline-queue';

describe('backoffDelayMs (offline retry schedule)', () => {
  it('follows exponential backoff ladder', () => {
    expect(backoffDelayMs(0)).toBe(2000);
    expect(backoffDelayMs(1)).toBe(5000);
    expect(backoffDelayMs(2)).toBe(15000);
    expect(backoffDelayMs(3)).toBe(60000);
    expect(backoffDelayMs(4)).toBe(300000);
  });

  it('caps at max delay for high attempt counts', () => {
    expect(backoffDelayMs(10)).toBe(300000);
    expect(backoffDelayMs(99)).toBe(300000);
  });
});