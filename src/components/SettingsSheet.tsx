import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun, LockKeyhole, Wallet, BatteryCharging, Phone, Trash2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { useSyncStore } from '@/stores/sync-store';

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const navigate = useNavigate();
  const courier = useAuthStore((s) => s.courier);
  const logout = useAuthStore((s) => s.logout);
  const pinEnabled = useAuthStore((s) => s.pinEnabled);
  const setPinEnabled = useAuthStore((s) => s.setPinEnabled);
  const { mode, setMode } = useThemeStore();
  const clearLocal = useSyncStore((s) => s.clearLocal);

  if (!open) return null;

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        aria-label="Tutup menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fade-in_150ms_ease-out]"
      />
      <div className="relative w-full max-w-md rounded-t-[28px] bg-raised pb-6 safe-area-bottom shadow-sheet animate-[slide-up_200ms_ease-out]">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-ink-muted/30" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand-pressed text-sm font-bold">
              {courier?.name?.charAt(0) ?? 'K'}
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-ink">{courier?.name ?? 'Kurir'}</p>
              <p className="flex items-center gap-1 text-[11px] text-ink-muted">
                <Phone className="size-3" /> {courier?.phone ?? '-'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-ink-muted hover:text-ink" aria-label="Tutup">
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[55dvh] overflow-y-auto px-4">
          <Card className="divide-y divide-border-subtle">
            <button onClick={() => go('/earnings')} className="flex w-full items-center gap-3 py-3 text-left">
              <Wallet className="size-5 text-ink-secondary" />
              <span className="text-sm text-ink">Pendapatan</span>
            </button>
            <button onClick={() => go('/battery-guide')} className="flex w-full items-center gap-3 py-3 text-left">
              <BatteryCharging className="size-5 text-ink-secondary" />
              <span className="text-sm text-ink">Tips Hemat Baterai</span>
            </button>
          </Card>

          <Card className="mt-3 divide-y divide-border-subtle">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                {mode === 'dark' ? <Moon className="size-5 text-ink-secondary" /> : <Sun className="size-5 text-ink-secondary" />}
                <span className="text-sm text-ink">Tema Gelap</span>
              </div>
              <ToggleSwitch checked={mode === 'dark'} onChange={(v) => setMode(v ? 'dark' : 'light')} label="Tema gelap" />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <LockKeyhole className="size-5 text-ink-secondary" />
                <span className="text-sm text-ink">Kunci PIN</span>
              </div>
              <ToggleSwitch checked={pinEnabled} onChange={(v) => setPinEnabled(v)} label="Kunci PIN" />
            </div>
          </Card>

          <Card className="mt-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Trash2 className="size-5 text-ink-secondary" />
                <span className="text-sm text-ink">Hapus Data Lokal</span>
              </div>
              <button onClick={() => clearLocal()} className="text-xs text-alert underline">
                Bersihkan
              </button>
            </div>
          </Card>

          <button
            onClick={() => logout()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-alert-soft py-3 text-sm font-semibold text-alert shadow-card active:scale-[0.98] transition-all"
          >
            <LogOut className="size-4" /> Keluar
          </button>
        </div>
      </div>
    </div>
  );
}
