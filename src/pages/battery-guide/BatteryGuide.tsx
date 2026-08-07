import { useNavigate } from 'react-router-dom';
import { BatteryCharging, Smartphone, Wifi, MapPin } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';

const TIPS = [
  {
    title: 'Kecerahan layar',
    body: 'Turunkan kecerahan otomatis ke 40-50% saat pengiriman. Layar adalah konsumsi baterai terbesar.',
    icon: Smartphone,
  },
  {
    title: 'GPS hanya saat perlu',
    body: 'Matikan GPS saat istirahat. Gunakan mode hemat daya / battery saver bawaan Android.',
    icon: MapPin,
  },
  {
    title: 'Data hemat',
    body: 'Nonaktifkan sinkronisasi latar belakang dan batasi penggunaan data saat sinyal lemah.',
    icon: Wifi,
  },
  {
    title: 'Battery saver',
    body: 'Aktifkan Battery Saver / Stamina mode sebelum mulai shift untuk membatasi proses latar belakang.',
    icon: BatteryCharging,
  },
];

const BRANDS: Array<{ name: string; steps: string[] }> = [
  {
    name: 'Samsung',
    steps: [
      'Settings → Battery → Battery saver → aktifkan',
      'Settings → Apps → Rumah Keripik → Battery → "Unrestricted"',
      'Settings → Device care → Battery → Background usage limits',
    ],
  },
  {
    name: 'Xiaomi / Redmi',
    steps: [
      'Settings → Battery → Battery saver',
      'Settings → Apps → Manage apps → Rumah Keripik → Battery saver → No restrictions',
      'Settings → Battery → Battery usage → Autostart → izinkan Rumah Keripik',
    ],
  },
  {
    name: 'Oppo / Vivo',
    steps: [
      'Settings → Battery → Power saver mode',
      'Settings → Apps → App management → Rumah Keripik → Allow background running',
      'Settings → Battery → App battery saver → Rumah Keripik → Do not optimize',
    ],
  },
  {
    name: 'Realme',
    steps: [
      'Settings → Battery → Battery saver',
      'Settings → Apps → Rumah Keripik → Battery saver → No restrictions',
      'Settings → Battery → Advanced settings → App freeze → nonaktifkan untuk Rumah Keripik',
    ],
  },
  {
    name: 'Android Standar',
    steps: [
      'Settings → Battery → Battery Saver',
      'Settings → Apps → Rumah Keripik → Battery → Unrestricted',
      'Settings → Location → App location permission → Allow all the time (saat shift aktif)',
    ],
  },
];

export default function BatteryGuide() {
  const navigate = useNavigate();
  return (
    <AppShell title="Tips Hemat Baterai" onBack={() => navigate(-1)}>
      <div className="flex flex-col gap-4">
        {TIPS.map((t) => (
          <Card key={t.title}>
            <div className="flex items-start gap-3">
              <t.icon className="mt-0.5 size-5 shrink-0 text-brand" />
              <div>
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                <p className="mt-1 text-xs text-ink-muted">{t.body}</p>
              </div>
            </div>
          </Card>
        ))}

        <h3 className="mt-2 text-sm font-bold text-ink">Panduan per Merek</h3>
        {BRANDS.map((b) => (
          <Card key={b.name}>
            <p className="mb-2 text-sm font-semibold text-ink">{b.name}</p>
            <ol className="flex flex-col gap-1.5">
              {b.steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-ink-muted">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-raised text-[10px] font-bold text-brand">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}