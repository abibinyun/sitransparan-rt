const DEFAULT_BASE_DOMAIN = 'openrt.local';
const DEFAULT_TENANT_SLUG = 'sitransparan-rt';
const PLATFORM_SUBDOMAINS = new Set(['app', 'api', 'www', 'admin', 'auth', 'mail', 'staging']);
const SECOND_LEVEL_TLDS = new Set([
  'web.id', 'co.id', 'ac.id', 'or.id', 'go.id', 'sch.id', 'mil.id', 'biz.id', 'my.id',
  'co.uk', 'org.uk', 'me.uk', 'com.au', 'net.au', 'org.au', 'co.jp', 'ne.jp'
]);

// The parent domain under which every tenant gets its own subdomain
// (<slug>.<baseDomain>). Dynamically derives root base domain from current window.location.hostname
// or env var VITE_TENANT_BASE_DOMAIN, fallback to openrt.local.
export function getTenantBaseDomain(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname.toLowerCase();
    if (host && host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
      const envDomain = (import.meta.env.VITE_TENANT_BASE_DOMAIN as string | undefined)?.toLowerCase();
      if (envDomain && (host === envDomain || host.endsWith('.' + envDomain))) {
        return envDomain;
      }
      const parts = host.split('.');
      if (parts.length >= 2) {
        const lastTwo = parts.slice(-2).join('.');
        if (SECOND_LEVEL_TLDS.has(lastTwo)) {
          // e.g. rt-003.iscube.web.id -> iscube.web.id (3 parts)
          // e.g. iscube.web.id -> iscube.web.id (3 parts)
          return parts.length >= 3 ? parts.slice(-3).join('.') : host;
        }
        // e.g. rt-003.openrt.local -> openrt.local (2 parts)
        // e.g. openrt.local -> openrt.local (2 parts)
        return parts.slice(-2).join('.');
      }
      return host;
    }
  }
  return (import.meta.env.VITE_TENANT_BASE_DOMAIN as string | undefined) || DEFAULT_BASE_DOMAIN;
}

const CUSTOM_DOMAIN_CACHE_KEY = 'resolved_tenant_slug';

// Synchronous fast-path: returns slug from subdomain if present, or cached custom domain slug, or null.
export function getTenantSlugFromHost(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname.toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '::1') return null;
  const base = getTenantBaseDomain().toLowerCase();
  if (host === base) return null;
  const suffix = '.' + base;
  if (host.endsWith(suffix)) {
    const sub = host.slice(0, -suffix.length);
    if (!sub || PLATFORM_SUBDOMAINS.has(sub)) return null;
    // Strip optional staging suffix (e.g. "rt-003-staging" -> "rt-003")
    const cleanSub = sub.endsWith('-staging') ? sub.slice(0, -'-staging'.length) : sub;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSub)) return null;
    return cleanSub;
  }
  // Foreign host: check session cache
  return sessionStorage.getItem(`${CUSTOM_DOMAIN_CACHE_KEY}:${host}`) || null;
}

// Asynchronously resolves custom domains via GET /api/v1/t/resolve?host=...
export async function resolveTenantSlug(): Promise<string> {
  const syncSlug = getTenantSlugFromHost();
  if (syncSlug) return syncSlug;

  if (typeof window === 'undefined') return DEFAULT_TENANT_SLUG;
  const host = window.location.hostname.toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '::1') return DEFAULT_TENANT_SLUG;

  const base = getTenantBaseDomain().toLowerCase();
  if (host === base) return DEFAULT_TENANT_SLUG;

  try {
    const res = await fetch(`/api/v1/t/resolve?host=${encodeURIComponent(host)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.slug) {
        sessionStorage.setItem(`${CUSTOM_DOMAIN_CACHE_KEY}:${host}`, data.slug);
        return data.slug;
      }
    }
  } catch {
    // fallback to default
  }
  return DEFAULT_TENANT_SLUG;
}

// Constructs full URL for a specific tenant on the same port and protocol
export function getTenantUrl(slug: string, path: string = '/'): string {
  if (typeof window === 'undefined') return path;
  const protocol = window.location.protocol;
  const port = window.location.port ? `:${window.location.port}` : '';
  const baseDomain = getTenantBaseDomain();
  const host = window.location.hostname.toLowerCase();
  const isStaging = host.includes('staging') || host.includes('-staging');
  const targetSubdomain = isStaging ? `${slug}-staging` : slug;
  return `${protocol}//${targetSubdomain}.${baseDomain}${port}${path.startsWith('/') ? path : '/' + path}`;
}

export function getPlatformUrl(path: string = '/'): string {
  if (typeof window === 'undefined') return path;
  const protocol = window.location.protocol;
  const port = window.location.port ? `:${window.location.port}` : '';
  const baseDomain = getTenantBaseDomain();
  const host = window.location.hostname.toLowerCase();
  const isStaging = host.includes('staging') || host.includes('-staging');
  const platformHost = isStaging ? `staging.${baseDomain}` : baseDomain;
  return `${protocol}//${platformHost}${port}${path.startsWith('/') ? path : '/' + path}`;
}

export function getTenantSlugOrFallback(): string {
  return getTenantSlugFromHost() || DEFAULT_TENANT_SLUG;
}
