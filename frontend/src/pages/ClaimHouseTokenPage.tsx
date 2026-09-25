import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { claimHouseToken } from '../services/house';
import { useAuthStore } from '../store/useAuthStore';
import { getTenantSlugFromHost } from '../utils/tenant';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Download, KeyRound } from 'lucide-react';
import { usePublicTenantQuery } from '../services/public_tenant';
import { TenantNotFoundPage } from '../components/TenantNotFoundPage';

export const ClaimHouseTokenPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const hostTenantSlug = getTenantSlugFromHost();
  const { data: tenantInfo, isLoading: isTenantLoading, isError: isTenantError } = usePublicTenantQuery();

  const [status, setStatus] = useState<'loading' | 'pin_required' | 'success' | 'error'>('loading');
  const [inputPin, setInputPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [houseInfo, setHouseInfo] = useState<{
    block_number: string;
    tenant_name: string;
    head_name?: string;
    pin_code?: string;
  } | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const executeClaim = (pinToSubmit?: string) => {
    const token = searchParams.get('token');
    const slug = searchParams.get('slug') || getTenantSlugFromHost() || 'sitransparan-rt';

    if (!token) {
      setStatus('error');
      setErrorMessage('Token QR tidak ditemukan pada tautan.');
      return;
    }

    setPinError('');
    claimHouseToken(slug, token, pinToSubmit)
      .then((res) => {
        const userObj = res.user
          ? {
              id: res.user.id,
              email: res.user.email,
              name: res.user.name,
              role: res.user.role || 'resident',
            }
          : {
              id: res.house.id,
              email: `${res.house.block_number.toLowerCase().replace(/[^a-z0-9]/g, '')}@warga.local`,
              name: res.head_resident?.full_name || `Warga ${res.house.block_number}`,
              role: 'resident',
            };
        const tenantObj = {
          id: res.house.id,
          name: res.tenant_name,
          slug: res.tenant_slug,
        };

        setAuth(res.token, userObj as any, tenantObj as any);

        setHouseInfo({
          block_number: res.house.block_number,
          tenant_name: res.tenant_name,
          head_name: res.head_resident?.full_name,
          pin_code: res.house.pin_code,
        });

        setStatus('success');
      })
      .catch((err) => {
        if (err.response?.status === 428 || err.response?.data?.error === 'pin_required') {
          setStatus('pin_required');
          return;
        }
        if (status === 'pin_required') {
          setPinError(err.response?.data?.error || 'PIN yang Anda masukkan salah.');
          return;
        }
        setStatus('error');
        setErrorMessage(
          err.response?.data?.error || 'Token QR tidak valid atau sudah diganti oleh pengurus RT.'
        );
      });
  };

  useEffect(() => {
    executeClaim();
  }, [searchParams]);

  if (hostTenantSlug && !isTenantLoading && (isTenantError || tenantInfo === null)) {
    return <TenantNotFoundPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg border-emerald-100">
        <CardContent className="p-6 text-center space-y-6">
          {status === 'loading' && (
            <div className="py-8 space-y-4">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
              <div>
                <h1 className="text-lg font-bold text-slate-800">
                  Memverifikasi Stiker QR Rumah...
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Menghubungkan ke sistem transparansi RT Anda.
                </p>
              </div>
            </div>
          )}

          {status === 'pin_required' && (
            <div className="py-6 space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-[#0071e3] rounded-full flex items-center justify-center mx-auto border border-blue-100">
                <KeyRound className="w-8 h-8" />
              </div>

              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  Verifikasi PIN Rumah
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Masukkan 4 digit PIN yang tertera pada stiker fisik pintu rumah atau diberikan oleh pengurus RT.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inputPin.trim().length >= 4) {
                    executeClaim(inputPin.trim());
                  }
                }}
                className="space-y-3 pt-2"
              >
                {pinError && (
                  <div className="p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                    {pinError}
                  </div>
                )}
                <div className="max-w-[200px] mx-auto">
                  <Input
                    type="password"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="••••"
                    value={inputPin}
                    onChange={(e) => setInputPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="text-center font-mono text-xl tracking-widest h-12 border-[#d2d2d7] focus:border-[#0071e3]"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={inputPin.length < 4}
                  className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white"
                >
                  Verifikasi & Masuk
                </Button>
              </form>
            </div>
          )}

          {status === 'success' && houseInfo && (
            <div className="py-4 space-y-5">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Akses Berhasil Terverifikasi
                </span>
                <h1 className="text-xl font-black text-slate-800 mt-3">
                  Selamat Datang di {houseInfo.tenant_name}
                </h1>
                <div className="mt-3 p-3 bg-slate-100 rounded-xl text-left text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Unit / Rumah:</span>
                    <strong className="text-slate-900">{houseInfo.block_number}</strong>
                  </div>
                  {houseInfo.head_name && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Kepala Keluarga:</span>
                      <strong className="text-emerald-800">{houseInfo.head_name}</strong>
                    </div>
                  )}
                  {houseInfo.pin_code && (
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200 mt-1">
                      <span className="text-slate-500">PIN Stiker Rumah:</span>
                      <strong className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-800">
                        {houseInfo.pin_code}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Anda kini dapat langsung memberikan suara di musyawarah/polling, menyampaikan aspirasi, dan memantau transparansi kas RT.
              </p>

              {deferredPrompt && !isInstalled && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <Download className="w-4 h-4 text-amber-700" />
                    Pasang Aplikasi RT di Layar Depan HP
                  </div>
                  <p className="text-[11px] text-amber-800 leading-normal">
                    Pasang ikon di HP Anda agar nanti bisa langsung buka kas & voting RT tanpa perlu scan ulang stiker QR.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleInstallClick}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-1.5 h-8"
                  >
                    Pasang Sekarang (Gratis & Ringan)
                  </Button>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => navigate('/')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2"
                >
                  Buka Portal Transparansi
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/usulan')}
                  className="w-full text-slate-700"
                >
                  Kirim Aspirasi & Usulan Warga
                </Button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4 space-y-5">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <AlertCircle className="w-10 h-10" />
              </div>

              <div>
                <h1 className="text-lg font-bold text-slate-800">
                  Gagal Membuka Akses Stiker QR
                </h1>
                <p className="text-xs text-rose-600 mt-2 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
                  {errorMessage}
                </p>
              </div>

              <p className="text-xs text-slate-500">
                Silakan hubungi pengurus RT Anda untuk mendapatkan stiker atau tautan akses QR yang baru.
              </p>

              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full mt-2"
              >
                Kembali ke Halaman Utama
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
