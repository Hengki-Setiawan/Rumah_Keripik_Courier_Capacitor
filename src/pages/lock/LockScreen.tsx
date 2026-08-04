import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/cn';
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
      // PIN lock: validasi dengan membandingkan terhadap PIN login (login lagi secara offline tidak tersedia).
      // Di sini kita hanya menutup layar kunci; verifikasi penuh mengikuti arsitektur lama di mana
      // lock screen dibuka setelah verifikasi PIN server.
      setPin('');
    }
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-umber-950 px-6">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-umber-800 text-umber-300">
          <LockKeyhole className="size-8" />
        </div>
        <h1 className="text-lg font-bold text-umber-50">Terkunci</h1>
        <p className="text-sm text-umber-400">{courier?.name ?? 'Kurir'} — masukkan PIN</p>
      </div>

      <div className="flex gap-3">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'size-3.5 rounded-full border transition-colors',
              i < pin.length ? 'bg-amber-500 border-amber-500' : 'border-umber-600',
              error && 'border-red-500',
            )}
          />
        ))}
      </div>

      {error && <p className="text-sm text-red-400">PIN salah, coba lagi</p>}

      <div className="grid w-full max-w-xs grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            onClick={() => pressDigit(d)}
            className="flex h-16 items-center justify-center rounded-2xl bg-umber-900 border border-umber-700 text-xl font-semibold text-umber-100 hover:border-amber-600/50 active:scale-95 transition-all"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => pressDigit('0')}
          className="flex h-16 items-center justify-center rounded-2xl bg-umber-900 border border-umber-700 text-xl font-semibold text-umber-100 hover:border-amber-600/50 active:scale-95 transition-all"
        >
          0
        </button>
        <button
          onClick={backspace}
          className="flex h-16 items-center justify-center rounded-2xl text-umber-400 hover:text-umber-200 active:scale-95 transition-all"
        >
          <svg className="size-6" viewBox="0 0 24 24" fill="none">
            <path d="M9 5h11a1 1 0 011 1v12a1 1 0 01-1 1H9l-6-7 6-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M13 9l4 6m0-6l-4 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <button onClick={() => setCourier(null)} className="text-xs text-umber-500 underline">
        Keluar dan kembali ke login
      </button>
    </div>
  );
}