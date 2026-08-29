import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA installability & offline caching
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New content available, refresh to update.');
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
