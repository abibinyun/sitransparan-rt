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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
