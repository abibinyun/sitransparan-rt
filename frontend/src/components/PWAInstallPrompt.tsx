import { useEffect, useState } from 'react';
import { Download, X, Smartphone, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'sitransparan_pwa_dismissed';

function checkIsAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Standard CSS display-mode standalone or fullscreen or minimal-ui
  const isStandaloneMedia =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches;
  if (isStandaloneMedia) return true;

  // 2. iOS Safari standalone property
  if ((window.navigator as any).standalone === true) return true;

  // 3. Android TWA / app referrer
  if (document.referrer.startsWith('android-app://')) return true;

  return false;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is running in installed mode
    if (checkIsAppInstalled()) {
      setIsInstalled(true);
      setIsVisible(false);
      return;
    }

    // Check getInstalledRelatedApps API if supported by modern browser
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any)
        .getInstalledRelatedApps()
        .then((relatedApps: any[]) => {
          if (Array.isArray(relatedApps) && relatedApps.length > 0) {
            setIsInstalled(true);
            setIsVisible(false);
          }
        })
        .catch(() => {});
    }

    // Listen for display-mode change (e.g. user opens in standalone)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setIsVisible(false);
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    // Listen for successful install event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if user previously dismissed prompt
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const hoursSinceDismiss = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      // Don't show again for 7 days if user dismissed it
      if (hoursSinceDismiss < 168) {
        setIsVisible(false);
        return () => {
          mediaQuery.removeEventListener('change', handleMediaChange);
          window.removeEventListener('appinstalled', handleAppInstalled);
        };
      }
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Double check before showing
      if (checkIsAppInstalled()) {
        setIsInstalled(true);
        setIsVisible(false);
        return;
      }
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  if (!isVisible || isInstalled) return null;

  return (
    <aside
      aria-label="Pemasangan Aplikasi"
      className="fixed bottom-20 md:bottom-6 right-4 z-40 max-w-sm w-full animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <div className="bg-slate-900/95 text-white backdrop-blur-md rounded-xl p-3.5 shadow-xl border border-slate-700/80 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
          <Smartphone className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-100">
              Pasang Aplikasi Warga
            </h4>
            <button
              onClick={handleDismiss}
              className="rounded-md p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Tutup pemberitahuan"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-300 line-clamp-1">
            Akses pengumuman, iuran &amp; agenda lebih cepat langsung dari layar utama HP.
          </p>

          {isIOS ? (
            <p className="mt-1.5 text-[10px] text-slate-400 bg-slate-800/80 rounded px-2 py-1">
              Ketuk tombol <strong>Bagikan</strong> di Safari lalu pilih <strong>Tambah ke Layar Utama</strong>.
            </p>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] h-7 px-2.5 rounded-lg shadow-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Pasang di HP
              </Button>
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Cepat &amp; hemat kuota
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
