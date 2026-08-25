const DEFAULT_BASE_DOMAIN = 'openrt.local';
const DEFAULT_TENANT_SLUG = 'sitransparan-rt';
const PLATFORM_SUBDOMAINS = new Set(['app', 'api', 'www', 'admin', 'auth', 'mail']);

// The parent domain under which every tenant gets its own subdomain
// (<slug>.<baseDomain>). Configured at build time via VITE_TENANT_BASE_DOMAIN so
// no production domain is hardcoded (development default: openrt.local).
// Must match the backend's TENANT_BASE_DOMAIN.
export function getTenantBaseDomain(): string {
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
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sub)) return null;
    return sub;
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
  return `${protocol}//${slug}.${baseDomain}${port}${path.startsWith('/') ? path : '/' + path}`;
}

export function getPlatformUrl(path: string = '/'): string {
  if (typeof window === 'undefined') return path;
  const protocol = window.location.protocol;
  const port = window.location.port ? `:${window.location.port}` : '';
  const baseDomain = getTenantBaseDomain();
  return `${protocol}//${baseDomain}${port}${path.startsWith('/') ? path : '/' + path}`;
}

export function getTenantSlugOrFallback(): string {
  return getTenantSlugFromHost() || DEFAULT_TENANT_SLUG;
}
