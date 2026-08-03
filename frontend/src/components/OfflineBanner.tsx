import { useState, useEffect } from 'react';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'offline' | 'online'>('online');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setToastMessage('Koneksi terhubung kembali. Anda sedang Online.');
      setToastType('online');
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setToastMessage('Koneksi internet terputus. Mode Offline aktif.');
      setToastType('offline');
      setShowToast(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs sm:text-sm font-medium px-4 py-2 text-center shadow-md flex items-center justify-center space-x-2">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
          </svg>
          <span>Anda sedang offline. Beberapa fitur mungkin terbatas dan data menggunakan cache.</span>
        </div>
      )}

      {showToast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium flex items-center space-x-3 transition-all duration-300 ${
            toastType === 'offline' ? 'bg-red-600' : 'bg-green-600'
          }`}
        >
          {toastType === 'offline' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-12.728 0a9 9 0 010-12.728m12.728 0L5.636 18.364" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span>{toastMessage}</span>
          <button
            onClick={() => setShowToast(false)}
            className="ml-2 text-white hover:text-gray-200 focus:outline-none"
          >
            &times;
          </button>
        </div>
      )}
    </>
  );
}
