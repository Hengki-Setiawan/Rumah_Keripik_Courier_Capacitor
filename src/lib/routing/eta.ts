// WITA = UTC+8 (Makassar, tempat bisnis beroperasi).
const WITA_OFFSET_HOURS = 8;

// Jam sibuk Makassar: 06.00-09.59 (pagi) & 16.00-19.59 (sore pulang).
// Direpresentasikan sebagai rentang [start, end) jam lokal.
const PEAK_HOURS: ReadonlyArray<readonly [number, number]> = [
  [6, 10],
  [16, 20],
];

// Durasi OSRM/ORS mengasumsikan kecepatan bebas hambatan. Konstanta ini
// adalah penalti empiris kemacetan kota saat jam sibuk (dapat disetel).
const PEAK_FACTOR = 1.35;

export function witaHour(date: Date = new Date()): number {
  return (date.getUTCHours() + WITA_OFFSET_HOURS) % 24;
}

export function isPeakHour(hour: number): boolean {
  return PEAK_HOURS.some(([start, end]) => hour >= start && hour < end);
}

export function peakEtaFactor(date: Date = new Date()): number {
  return isPeakHour(witaHour(date)) ? PEAK_FACTOR : 1;
}

/**
 * Kalibrasi durasi rute mentah (detik, dari ORS/OSRM yang mengasumsikan
 * arus bebas) menjadi estimasi realistis berdasarkan waktu pengiriman.
 * Murni & cache-safe: tidak menyentuh server dan nilai tersimpan tetap ikut
 * kalibrasi waktu tampil, bukan waktu build.
 */
export function calibrateDurationSeconds(rawSeconds: number, date: Date = new Date()): number {
  if (!rawSeconds || rawSeconds <= 0) return rawSeconds;
  return Math.round(rawSeconds * peakEtaFactor(date));
}

/**
 * ETA berbasis kecepatan riil GPS kurir: jarak tersisa / kecepatan aktual.
 * Dipakai saat kendaraan bergerak (kecepatan wajar), menggantikan estimasi
 * berbasis durasi statis yang bisa tidak akurat saat macet/terobos jalan sepi.
 */
export function etaMinutesFromSpeed(distanceM: number, speedKmH: number): number {
  if (!distanceM || distanceM <= 0 || !speedKmH || speedKmH <= 0) return 0;
  return Math.max(1, Math.round((distanceM / 1000 / speedKmH) * 60));
}