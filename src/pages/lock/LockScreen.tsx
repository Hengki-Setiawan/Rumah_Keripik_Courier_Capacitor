import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/cn';
import { NumpadKey } from '@/components/ui/NumpadKey';
import { hapticImpact } from '@/lib/haptics';
import { LockKeyhole, ArrowLeft } from 'lucide-react';

const PIN_LENGTH = 6;

type LockMode = 'unlock' | 'setup' | 'disable';

export default function LockScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modeParam = (searchParams.get('mode') ?? 'unlock') as LockMode;
  const courier = useAuthStore((s) => s.courier);
  const verifyPin = useAuthStore((s) => s.verifyPin);
  const setPin = useAuthStore((s) => s.setPin);
  const setPinEnabled = useAuthStore((s) => s.setPinEnabled);
  const logout = useAuthStore((s) => s.logout);

  const mode = modeParam as LockMode;
  const [pin, setPinValue] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const isSetup = mode === 'setup';
  const isDisable = mode === 'disable';
  const title = isSetup ? 'Atur PIN' : isDisable ? 'Masukkan PIN' : 'Terkunci';
  const subtitle = isSetup ? 'Buat PIN 6 digit untuk mengunci aplikasi' : `${courier?.name ?? 'Kurir'} - masukkan PIN`;

  function resetInput() {
    setPinValue('');
    setConfirmPin('');
    setError(false);
  }

  function submit() {
    if (busy) return;
    setError(false);

    if (isSetup) {
      if (pin.length < PIN_LENGTH) return;
      if (!confirmPin) {
        setConfirmPin(pin);
        setPinValue('');
        return;
      }
      if (pin !== confirmPin) {
        setError(true);
        resetInput();
        return;
      }
      setBusy(true);
      void setPin(pin).then(() => {
        setBusy(false);
        navigate('/', { replace: true });
      });
      return;
    }

    setBusy(true);
    void verifyPin(pin)
      .then((ok) => {
        setBusy(false);
        if (!ok) {
          setError(true);
          resetInput();
          return;
        }
        if (isDisable) {
          void setPinEnabled(false);
        }
        navigate('/', { replace: true });
      })
      .catch(() => {
        setBusy(false);
        setError(true);
        resetInput();
      });
  }

  function pressDigit(d: string) {
    void hapticImpact('light');
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setPinValue(next);
    if (next.length === PIN_LENGTH) {
      setTimeout(submit, 120);
    }
  }

  function backspace() {
    void hapticImpact('light');
    setPinValue((p) => p.slice(0, -1));
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-surface px-6">
      <div className="flex w-full max-w-xs items-center">
        {modeParam !== 'unlock' ? (
          <button
            aria-label="Kembali"
            onClick={() => navigate('/')}
            className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:text-ink active:scale-95 transition-all"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <span className="size-11" />
        )}
        <div className="flex-1" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-brand-soft text-brand">
          <LockKeyhole className="size-8" />
        </div>
        <h1 className="text-lg font-bold text-ink">{title}</h1>
        <p className="text-sm text-ink-secondary">{subtitle}</p>
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

      {isSetup && confirmPin && (
        <p className="text-xs text-ink-secondary">Konfirmasi PIN baru</p>
      )}

      {error && (
        <p className="text-sm text-alert">{isSetup ? 'PIN tidak cocok, coba lagi' : 'PIN salah, coba lagi'}</p>
      )}

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

      {mode === 'unlock' && (
        <button
          onClick={() => {
            void logout();
          }}
          className="flex h-11 items-center px-2 text-xs text-ink underline"
        >
          Keluar dan kembali ke login
        </button>
      )}
    </div>
  );
}
