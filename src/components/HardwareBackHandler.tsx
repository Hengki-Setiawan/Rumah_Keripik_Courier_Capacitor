import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

const HOME_ROUTES = ['/', '/history', '/stats'];

export function HardwareBackHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removed = false;
    const handler = App.addListener('backButton', () => {
      const path = location.pathname;

      // Di halaman utama, tombol back menutup aplikasi.
      if (HOME_ROUTES.includes(path)) {
        App.exitApp();
        return;
      }

      // Punya riwayat sebelumnya (masuk dari dashboard/history/route) → kembali.
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (idx > 0) {
        navigate(-1);
        return;
      }

      // Tidak ada riwayat (mis. deep link langsung) → aman ke beranda.
      navigate('/');
    });

    handler.then((h) => {
      if (removed) h.remove();
    });

    return () => {
      removed = true;
      handler.then((h) => h.remove());
    };
  }, [location.pathname, navigate]);

  return null;
}
