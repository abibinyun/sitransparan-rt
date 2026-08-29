import { useEffect, useState } from 'react';
import { Download, X, Smartphone, CheckCircle2, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isAppStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isAppStandalone);

    if (isAppStandalone) {
      setIsVisible(false);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback if browser hasn't fired beforeinstallprompt yet
      setShowManualGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || isStandalone) return null;

  return (
    <>
      <div className="fixed bottom-16 md:bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-4 text-white shadow-2xl ring-1 ring-white/20">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-md">
              <Smartphone className="h-6 w-6" />
            </div>

            <div className="flex-1 pr-4">
              <h4 className="text-sm font-bold text-white leading-tight">
                Pasang Aplikasi Warga RT
              </h4>
              <p className="mt-1 text-xs text-blue-100 leading-relaxed">
                Buka pengumuman, voting &amp; kas RT lebih cepat tanpa perlu buka browser.
              </p>

              {isIOS ? (
                <div className="mt-2 text-xs bg-white/10 rounded-lg p-2 text-blue-50">
                  Ketuk tombol <b>Bagikan (Share)</b> di Safari lalu pilih <b>"Tambah ke Layar Utama"</b>.
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleInstallClick}
                    className="bg-white text-blue-700 hover:bg-blue-50 font-semibold text-xs h-8 px-3 shadow"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Pasang di HP
                  </Button>
                  <div className="flex items-center gap-1 text-[11px] text-blue-100">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Ringan &amp; Cepat
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showManualGuide && !isIOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white text-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-2 text-blue-600 font-bold mb-3">
              <HelpCircle className="h-5 w-5" />
              Cara Pasang di HP Android
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Jika tombol otomatis belum muncul, Anda bisa memasangnya dalam 2 langkah mudah:
            </p>
            <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside bg-slate-50 p-3 rounded-lg border">
              <li>Ketuk ikon <b>titik tiga (⋮)</b> di pojok kanan atas browser Chrome.</li>
              <li>Pilih menu <b>"Pasang aplikasi"</b> atau <b>"Tambahkan ke Layar Utama"</b>.</li>
            </ol>
            <Button
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
              onClick={() => setShowManualGuide(false)}
            >
              Saya Mengerti
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
