import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDateTime, formatTime, formatDistanceKm, maskPhone, relativeTime } from '@/lib/format';

describe('formatCurrency', () => {
  it('formats numbers with id-ID grouping', () => {
    expect(formatCurrency(10000)).toBe('Rp 10.000');
    expect(formatCurrency(1234567)).toBe('Rp 1.234.567');
  });

  it('handles null/undefined/NaN gracefully', () => {
    expect(formatCurrency(null)).toBe('Rp 0');
    expect(formatCurrency(undefined)).toBe('Rp 0');
    expect(formatCurrency('garbage')).toBe('Rp 0');
  });

  it('accepts numeric strings', () => {
    expect(formatCurrency('25000')).toBe('Rp 25.000');
  });
});

describe('formatDistanceKm', () => {
  it('shows meters under 1 km', () => {
    expect(formatDistanceKm(0.5)).toBe('500 m');
  });

  it('shows km with one decimal', () => {
    expect(formatDistanceKm(2.5)).toBe('2,5 km');
  });

  it('handles invalid input', () => {
    expect(formatDistanceKm(undefined)).toBe('-');
  });
});

describe('maskPhone', () => {
  it('masks middle digits', () => {
    expect(maskPhone('081234567890')).toBe('081****890');
  });

  it('leaves short phones untouched', () => {
    expect(maskPhone('123')).toBe('123');
  });

  it('returns empty for null', () => {
    expect(maskPhone(null)).toBe('');
  });
});

describe('date formatters', () => {
  it('returns dash for invalid dates', () => {
    expect(formatDateTime('not-a-date')).toBe('-');
    expect(formatTime(null)).toBe('-');
  });
});

describe('relativeTime', () => {
  it('returns just-now for recent timestamps', () => {
    expect(relativeTime(new Date().toISOString())).toBe('baru saja');
  });

  it('returns empty for invalid input', () => {
    expect(relativeTime(null)).toBe('');
  });
});