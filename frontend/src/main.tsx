import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register standard Service Worker for PWA & Push Notifications without any auto-reload
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
