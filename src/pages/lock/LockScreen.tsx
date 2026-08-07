import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/cn';
import { NumpadKey } from '@/components/ui/NumpadKey';
import { hapticImpact } from '@/lib/haptics';
import { LockKeyhole } from 'lucide-react';

const PIN_LENGTH = 6;

export default function LockScreen() {
  const courier = useAuthStore((s) => s.courier);
  const setCourier = useAuthStore((s) => s.setCourier);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  function pressDigit(d: string) {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === PIN_LENGTH) {
      setPin('');
    }
  }

  function backspace() {
    void hapticImpact('light');
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-surface px-6">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-brand-subtle text-brand">
          <LockKeyhole className="size-8" />
        </div>
        <h1 className="text-lg font-bold text-ink">Terkunci</h1>
        <p className="text-sm text-ink-secondary">{courier?.name ?? 'Kurir'} - masukkan PIN</p>
      </div>

      <div className="flex gap-3">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'size-3.5 rounded-full border transition-all duration-150',
              i < pin.length ? 'scale-110 bg-brand border-brand' : 'border-ink-muted/40',
              error && 'border-red-500',
            )}
          />
        ))}
      </div>

      {error && <p className="text-sm text-alert">PIN salah, coba lagi</p>}

      <div className="grid w-full max-w-xs grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <NumpadKey key={d} digit={d} onClick={() => pressDigit(d)} className="mx-auto" />
        ))}
        <div />
        <NumpadKey digit="0" onClick={() => pressDigit('0')} className="mx-auto" />
        <button
          onClick={backspace}
          aria-label="Hapus"
          className="mx-auto flex size-20 items-center justify-center rounded-full text-ink-muted hover:text-ink active:scale-95 transition-all"
        >
          <svg className="size-7" viewBox="0 0 24 24" fill="none">
            <path d="M9 5h11a1 1 0 011 1v12a1 1 0 01-1 1H9l-6-7 6-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M13 9l4 6m0-6l-4 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <button onClick={() => setCourier(null)} className="flex h-11 items-center px-2 text-xs text-ink underline">
        Keluar dan kembali ke login
      </button>
    </div>
  );
}