import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/cn';
import { Spinner } from '@/components/ui/Button';

const PIN_LENGTH = 6;

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const loginError = useAuthStore((s) => s.loginError);
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function pressDigit(d: string) {
    if (pin.length >= PIN_LENGTH || submitting) return;
    const next = pin + d;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      setSubmitting(true);
      const res = await login(next);
      if (!res.ok) {
        setPin('');
        setSubmitting(false);
      }
    }
  }

  function backspace() {
    if (submitting) return;
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-umber-950 px-6">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-amber-500/15 border border-amber-500/25 text-amber-500">
          <svg className="size-10" viewBox="0 0 24 24" fill="none">
            <path d="M8 11V7a4 4 0 118 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <rect x="4" y="11" width="16" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-umber-50">Rumah Keripik Kurir</h1>
        <p className="text-sm text-umber-400">Masukkan PIN untuk masuk</p>
      </div>

      <div className="flex gap-3">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'size-3.5 rounded-full border transition-colors',
              i < pin.length
                ? 'bg-amber-500 border-amber-500'
                : 'border-umber-600 bg-transparent',
            )}
          />
        ))}
      </div>

      {loginError && <p className="text-sm text-red-400">{loginError}</p>}

      <div className="grid w-full max-w-xs grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            onClick={() => pressDigit(d)}
            disabled={submitting}
            className="flex h-16 items-center justify-center rounded-2xl bg-umber-900 border border-umber-700 text-xl font-semibold text-umber-100 hover:border-amber-600/50 active:scale-95 transition-all disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => pressDigit('0')}
          disabled={submitting}
          className="flex h-16 items-center justify-center rounded-2xl bg-umber-900 border border-umber-700 text-xl font-semibold text-umber-100 hover:border-amber-600/50 active:scale-95 transition-all disabled:opacity-50"
        >
          0
        </button>
        <button
          onClick={backspace}
          disabled={submitting}
          className="flex h-16 items-center justify-center rounded-2xl text-umber-400 hover:text-umber-200 active:scale-95 transition-all disabled:opacity-50"
        >
          <svg className="size-6" viewBox="0 0 24 24" fill="none">
            <path d="M9 5h11a1 1 0 011 1v12a1 1 0 01-1 1H9l-6-7 6-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M13 9l4 6m0-6l-4 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {submitting && (
        <div className="flex items-center gap-2 text-sm text-amber-500">
          <Spinner className="size-4" /> Memverifikasi PIN...
        </div>
      )}
    </div>
  );
}