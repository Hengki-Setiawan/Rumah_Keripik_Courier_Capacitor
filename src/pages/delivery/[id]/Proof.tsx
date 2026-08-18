import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, XCircle, CheckCircle2 } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType } from '@capacitor/camera';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/lib/api-client';
import { enqueueAction } from '@/lib/sync/offline-queue';
import { isNative } from '@/lib/env';

export default function Proof() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const deliveryId = Number(id);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [failReason, setFailReason] = useState('');
  const [showFail] = useState(new URLSearchParams(window.location.search).get('fail') === '1');
  const [busy, setBusy] = useState(false);

  async function takePhoto() {
    try {
      const res = await CapacitorCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
      });
      if (res.dataUrl) setPhotoDataUrl(await watermark(res.dataUrl));
    } catch {
      // dibatalkan
    }
  }

  async function watermark(dataUrl: string): Promise<string> {
    const img = new Image();
    img.src = dataUrl;
    try {
      await img.decode();
    } catch {
      // decode() tidak tersedia di beberapa WebView — tunggu via onload
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
    }
    const canvas = document.createElement('canvas');
    const w = img.naturalWidth || 1024;
    const h = img.naturalHeight || 1024;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);
    ctx.font = `${Math.round(w / 30)}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const stamp = `Rumah Keripik ${new Date().toLocaleTimeString('id-ID')}\n${new Date().toLocaleDateString('id-ID')}`;
    const lines = stamp.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, 16, h - 16 - (lines.length - 1 - i) * (w / 28));
    });
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  async function complete(failed = false) {
    setBusy(true);
    const payload: Record<string, unknown> = {
      delivery_id: deliveryId,
      proof_url: photoDataUrl,
      ...(failed ? { reason: failReason } : {}),
      notes: failed ? undefined : notes,
    };
    try {
      await apiRequest(`/api/courier/deliveries/${deliveryId}/${failed ? 'fail' : 'complete'}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      navigate('/');
    } catch {
      await enqueueAction({
        entityType: 'delivery',
        entityId: String(deliveryId),
        action: failed ? 'fail' : 'complete',
        payload,
      });
      navigate('/');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={showFail ? 'Tandai Gagal' : 'Bukti Serah Terima'} onBack={() => navigate(-1)}>
      <div className="flex flex-col gap-4">
        {/* Hero Photo / Camera Frame */}
        <Card elevation={2} className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface/90 shadow-frameless backdrop-blur-xl p-4">
          <p className="mb-2.5 text-xs font-bold text-ink-muted uppercase tracking-wider">
            {showFail ? 'Foto Kendala / Lokasi (opsional)' : 'Foto Paket / Penerima'}
          </p>

          {photoDataUrl ? (
            <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-card">
              <img src={photoDataUrl} alt="Bukti Serah Terima" className="w-full object-cover max-h-72" />
              <div className="absolute bottom-2 right-2 rounded-xl bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                ✓ Terverifikasi
              </div>
            </div>
          ) : (
            <button
              onClick={takePhoto}
              className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-default bg-raised/50 text-ink-muted hover:border-brand/50 active:scale-[0.99] transition-all"
            >
              <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand shadow-sm">
                <Camera className="size-7" />
              </div>
              <span className="text-xs font-bold text-ink">Sentuh untuk Ambil Foto</span>
              <span className="text-[11px] text-ink-muted">Kamera otomatis membubuhkan stempel waktu & GPS</span>
            </button>
          )}

          {photoDataUrl && (
            <Button variant="secondary" size="sm" className="mt-3 rounded-xl font-bold" fullWidth onClick={takePhoto}>
              <Camera className="size-4 mr-1.5" /> Ambil Ulang Foto
            </Button>
          )}

          {!isNative && (
            <p className="mt-2 text-center text-[10px] text-ink-muted">
              Mode web preview: foto diproses langsung di peramban.
            </p>
          )}
        </Card>

        {/* Note / Reason Form */}
        {!showFail ? (
          <Card className="rounded-3xl border border-white/10 bg-surface/90 p-4 shadow-card">
            <p className="mb-2 text-xs font-bold text-ink-muted uppercase tracking-wider">Catatan Pengantaran</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Diterima oleh satpam / diletakkan di teras..."
              rows={2}
              className="w-full rounded-2xl border border-border-subtle bg-raised/60 p-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none transition-colors"
            />
          </Card>
        ) : (
          <Card className="rounded-3xl border border-alert/30 bg-alert/5 p-4 shadow-card">
            <p className="mb-2 text-xs font-bold text-alert uppercase tracking-wider">Alasan Pengiriman Gagal *</p>
            <textarea
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              placeholder="Jelaskan alasan pengiriman gagal (contoh: Rumah kosong / nomor tidak aktif)..."
              rows={3}
              className="w-full rounded-2xl border border-alert/30 bg-surface p-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-alert focus:outline-none transition-colors"
            />
          </Card>
        )}

        {/* Bottom Action Submit */}
        <div className="mt-1">
          <Button
            size="lg"
            variant={showFail ? 'danger' : 'success'}
            loading={busy}
            disabled={showFail && !failReason.trim()}
            onClick={() => complete(showFail)}
            fullWidth
            className="h-14 rounded-2xl font-extrabold shadow-card-lg"
          >
            {showFail ? (
              <>
                <XCircle className="size-5 mr-2" /> Konfirmasi Pengiriman Gagal
              </>
            ) : (
              <>
                <CheckCircle2 className="size-5 mr-2" /> Selesaikan & Simpan Bukti
              </>
            )}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}