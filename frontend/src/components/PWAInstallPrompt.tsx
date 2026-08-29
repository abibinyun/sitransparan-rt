import { useEffect, useState } from 'react';
import { Download, X, Smartphone, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed)
    const isAppStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isAppStandalone);

    if (isAppStandalone) return;

    // Check if dismissed previously in this session
    const dismissed = localStorage.getItem('sitransparan_pwa_dismissed');
    if (dismissed && Date.now() - parseInt(dismissed, 10) < 24 * 60 * 60 * 1000) {
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

    // If iOS and not installed, show helper after 3 seconds
    if (isIosDevice && !isAppStandalone) {
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('sitransparan_pwa_dismissed', Date.now().toString());
  };

  if (!isVisible || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
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
              Buka pengumuman, voting & kas RT lebih cepat tanpa perlu buka browser.
            </p>

            {isIOS ? (
              <div className="mt-2 text-xs bg-white/10 rounded-lg p-2 text-blue-50">
                Ketuk tombol <b>Bagikan (Share)</b> lalu pilih <b>"Tambah ke Layar Utama"</b>.
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
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Ringan & Cepat
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
