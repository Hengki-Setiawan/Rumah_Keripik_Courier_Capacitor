import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun, LockKeyhole, Wallet, BatteryCharging, ChevronRight, Phone } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { CollapsingHeader } from '@/components/ui/CollapsingHeader';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { useSyncStore } from '@/stores/sync-store';

export default function Profile() {
  const navigate = useNavigate();
  const courier = useAuthStore((s) => s.courier);
  const logout = useAuthStore((s) => s.logout);
  const pinEnabled = useAuthStore((s) => s.pinEnabled);
  const setPinEnabled = useAuthStore((s) => s.setPinEnabled);
  const { mode, setMode } = useThemeStore();
  const clearLocal = useSyncStore((s) => s.clearLocal);

  const rows = [
    { icon: Wallet, label: 'Pendapatan', onClick: () => navigate('/earnings') },
    { icon: BatteryCharging, label: 'Tips Hemat Baterai', onClick: () => navigate('/battery-guide') },
  ];

  return (
    <AppShell title="Profil" activeTab="profil" onTabChange={(t) => navigate(t === 'beranda' ? '/' : `/${t}`)}>
      <div className="flex flex-col gap-4">
        <CollapsingHeader
          collapsedTitle={
            <>
              <div className="flex size-8 items-center justify-center rounded-full bg-amber-500/15 text-amber-400 text-sm font-bold">
                {courier?.name?.charAt(0) ?? 'K'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold leading-tight text-umber-50">{courier?.name ?? 'Kurir'}</p>
                <p className="text-[11px] text-umber-400">Akun Terverifikasi Aktif</p>
              </div>
            </>
          }
        >
          <div className="flex items-center gap-4 rounded-2xl border border-umber-700/60 bg-umber-900/95 p-4 backdrop-blur-lg">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 text-umber-950 text-2xl font-bold ring-2 ring-amber-500/60">
              {courier?.name?.charAt(0) ?? 'K'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold text-umber-50">{courier?.name ?? 'Kurir'}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-umber-400">
                <Phone className="size-3" /> {courier?.phone ?? '-'}
              </p>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400" /> Akun Terverifikasi Aktif
              </span>
            </div>
          </div>
        </CollapsingHeader>

        <Card>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              {mode === 'dark' ? <Moon className="size-5 text-umber-300" /> : <Sun className="size-5 text-umber-300" />}
              <span className="text-sm text-umber-100">Tema Gelap</span>
            </div>
            <ToggleSwitch checked={mode === 'dark'} onChange={(v) => setMode(v ? 'dark' : 'light')} label="Tema gelap" />
          </div>
          <div className="flex items-center justify-between py-2 border-t border-umber-700/50">
            <div className="flex items-center gap-3">
              <LockKeyhole className="size-5 text-umber-300" />
              <span className="text-sm text-umber-100">Kunci PIN</span>
            </div>
            <ToggleSwitch checked={pinEnabled} onChange={(v) => setPinEnabled(v)} label="Kunci PIN" />
          </div>
        </Card>

        <Card className="divide-y divide-umber-700/50">
          {rows.map(({ icon: Icon, label, onClick }) => (
            <button key={label} onClick={onClick} className="flex w-full items-center justify-between py-3 text-left">
              <div className="flex items-center gap-3">
                <Icon className="size-5 text-umber-300" />
                <span className="text-sm text-umber-100">{label}</span>
              </div>
              <ChevronRight className="size-4 text-umber-500" />
            </button>
          ))}
        </Card>

        <Card>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-umber-100">Hapus Data Lokal</span>
            </div>
            <button onClick={() => clearLocal()} className="text-xs text-red-400 underline">
              Bersihkan
            </button>
          </div>
        </Card>

        <button
          onClick={() => logout()}
          className="flex items-center justify-center gap-2 rounded-2xl border border-red-600/40 bg-red-950/30 py-3 text-sm font-semibold text-red-400 hover:bg-red-950/50 active:scale-[0.98] transition-all"
        >
          <LogOut className="size-4" /> Keluar
        </button>
      </div>
    </AppShell>
  );
}