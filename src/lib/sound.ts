/**
 * Web Audio API Sound Synthesizer
 * Menghasilkan feedback nada manis secara instan tanpa membutuhkan file MP3 eksternal (0 kB).
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Victory Chime: Nada arpeggio sukses (C6, E6, G6, C7) yang lembut dan memuaskan
   * saat kurir menyelesaikan pengiriman paket.
   */
  playVictoryChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7
    const noteDuration = 0.09;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * noteDuration);

      // Volume envelope: attack cepat, decay halus
      gain.gain.setValueAtTime(0.001, now + index * noteDuration);
      gain.gain.exponentialRampToValueAtTime(0.18, now + index * noteDuration + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * noteDuration + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * noteDuration);
      osc.stop(now + index * noteDuration + 0.4);
    });
  }

  /**
   * Subtle Click / Tactile Pop: Bunyi pop mikro saat menekan tombol keypad PIN
   */
  playKeypadClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }
}

export const sound = new SoundSynthesizer();
