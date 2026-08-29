import { api } from './api';
import { getTenantSlugOrFallback } from '../utils/tenant';

export interface PushConfig {
  enabled: boolean;
  public_key: string;
}

export interface ParticipationBadgeInfo {
  reactions_given: number;
  votes_cast: number;
  total: number;
  level: string;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function getPushConfig(): Promise<PushConfig | null> {
  try {
    const res = await api.get<PushConfig>('/push/config');
    return res.data;
  } catch {
    return null;
  }
}

export async function enablePushNotifications(): Promise<{ ok: boolean; reason?: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'Peramban tidak mendukung notifikasi.' };
  }
  const cfg = await getPushConfig();
  if (!cfg?.enabled || !cfg.public_key) {
    return { ok: false, reason: 'Notifikasi belum aktif di server.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, reason: 'Izin notifikasi tidak diberikan.' };
    }

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.public_key) as BufferSource,
      }));

    const json = sub.toJSON();
    const keys = json.keys as { p256dh: string; auth: string };
    const tenantSlug = getTenantSlugOrFallback();

    await api.post('/push/subscribe', {
      tenant_slug: tenantSlug || undefined,
      endpoint: sub.endpoint,
      keys_p256dh: keys.p256dh,
      keys_auth: keys.auth,
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, reason: err?.response?.data?.error || err.message || 'Gagal mengaktifkan notifikasi' };
  }
}

export async function getBadge(): Promise<ParticipationBadgeInfo | null> {
  try {
    const res = await api.get<ParticipationBadgeInfo>('/social/badge');
    return res.data;
  } catch {
    return null;
  }
}
