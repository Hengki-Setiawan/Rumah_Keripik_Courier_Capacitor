import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, XCircle, CheckCircle2 } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType } from '@capacitor/camera';
import SignatureCanvas from 'react-signature-canvas';
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
  const sigRef = useRef<SignatureCanvas>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [failReason, setFailReason] = useState('');
  const [showFail, setShowFail] = useState(false);
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
    const signatureDataUrl = sigRef.current?.isEmpty() ? undefined : sigRef.current?.toDataURL();
    const payload: Record<string, unknown> = {
      delivery_id: deliveryId,
      signature_base64: signatureDataUrl,
      proof_url: photoDataUrl,
      notes: failed ? failReason : notes,
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
    <AppShell title="Bukti Pengiriman">
      <div className="flex flex-col gap-4">
        <Card>
          <p className="mb-2 text-xs font-semibold text-umber-400">Foto Barang / Bukti</p>
          {photoDataUrl ? (
            <img src={photoDataUrl} alt="Bukti" className="w-full rounded-xl" />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-umber-700 bg-umber-950/60 text-umber-500">
              Belum ada foto
            </div>
          )}
          <Button variant="secondary" className="mt-3" fullWidth onClick={takePhoto}>
            <Camera className="size-4" /> {photoDataUrl ? 'Ambil Ulang' : 'Ambil Foto'}
          </Button>
          {!isNative && (
            <p className="mt-2 text-center text-[10px] text-umber-600">
              Mode web: foto diambil dari kamera browser bila tersedia.
            </p>
          )}
        </Card>

        <Card>
          <p className="mb-2 text-xs font-semibold text-umber-400">Tanda Tangan Penerima</p>
          <div className="rounded-xl border border-umber-700 bg-white">
            <SignatureCanvas
              ref={sigRef}
              canvasProps={{ width: 600, height: 200, className: 'w-full' }}
              penColor="#120f0d"
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-umber-600">Tanda tangani di area di atas</span>
            <button
              onClick={() => sigRef.current?.clear()}
              className="text-[10px] font-semibold text-umber-500 underline"
            >
              Hapus
            </button>
          </div>
        </Card>

        {!showFail ? (
          <Card>
            <p className="mb-2 text-xs font-semibold text-umber-400">Catatan</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan (opsional)..."
              rows={2}
              className="w-full rounded-xl border border-umber-700 bg-umber-950 p-3 text-sm text-umber-100 placeholder:text-umber-600 focus:border-amber-600 focus:outline-none"
            />
          </Card>
        ) : (
          <Card>
            <p className="mb-2 text-xs font-semibold text-umber-400">Alasan Gagal</p>
            <textarea
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              placeholder="Jelaskan alasan pengiriman gagal..."
              rows={3}
              className="w-full rounded-xl border border-red-700 bg-umber-950 p-3 text-sm text-umber-100 placeholder:text-umber-600 focus:border-red-600 focus:outline-none"
            />
          </Card>
        )}

        <div className="flex flex-col gap-2">
          <Button size="lg" loading={busy} onClick={() => complete(false)} fullWidth>
            <CheckCircle2 className="size-5" /> Selesaikan Pengiriman
          </Button>
          <Button variant="danger" loading={busy} onClick={() => (showFail ? complete(true) : setShowFail(true))} fullWidth>
            <XCircle className="size-5" /> {showFail ? 'Kirim & Tandai Gagal' : 'Tandai Gagal'}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}