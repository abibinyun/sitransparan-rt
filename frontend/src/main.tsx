import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA installability & offline caching
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Segera aktifkan versi baru tanpa menahan tampilan lama di cache
    updateSW(true);
  },
  onOfflineReady() {
    console.log('App ready to work offline.');
  },
});

// Otomatis cek update service worker saat halaman dibuka kembali atau online
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Bersihkan cache lama pages-cache jika masih ada di browser user
  if ('caches' in window) {
    window.caches.keys().then((names) => {
      names.forEach((name) => {
        if (name.includes('pages-cache') || name.includes('workbox-precache')) {
          // Bersihkan cache yang berpotensi menyimpan index.html usang
          window.caches.open(name).then((cache) => {
            cache.delete('/');
            cache.delete('/kabar');
            cache.delete('/index.html');
          });
        }
      });
    });
  }

  window.addEventListener('focus', () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.update();
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
