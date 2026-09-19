import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook untuk mengecek update Service Worker dan mengaplikasikannya
 * secara mulus (seamless) HANYA ketika rute/halaman berpindah,
 * bukan saat user sedang mengisi form atau membuka file picker kamera/galeri.
 */
export function useSeamlessUpdate() {
  const location = useLocation();
  const hasUpdateRef = useRef(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        // Jangan reload jika ada modal dialog terbuka di layar
        const isModalOpen = document.querySelector('[role="dialog"]') !== null;
        if (isModalOpen) {
          hasUpdateRef.current = true;
          return;
        }
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      registrationRef.current = reg;

      // Cek apakah ada worker yang sedang menunggu (waiting)
      if (reg.waiting) {
        hasUpdateRef.current = true;
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            hasUpdateRef.current = true;
          }
        });
      });
    });

    // Cek update di background setiap 15 menit secara diam-diam
    const interval = setInterval(() => {
      registrationRef.current?.update().catch(() => {});
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Saat rute berpindah (user klik menu navigasi)
  useEffect(() => {
    if (hasUpdateRef.current && registrationRef.current?.waiting) {
      // Pastikan tidak ada modal formulir yang sedang terbuka di layar
      const isModalOpen = document.querySelector('[role="dialog"]') !== null;
      if (!isModalOpen) {
        hasUpdateRef.current = false;
        registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  }, [location.pathname]);
}
