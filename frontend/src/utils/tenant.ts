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

// Returns the tenant slug encoded in the current hostname (e.g.
// rt-003.openrt.local -> 'rt-003'), or null when the hostname is a platform
// host (localhost, the base domain itself, a reserved subdomain such as
// app/api/www) or does not belong to the configured base domain.
//
// A hostname outside the base domain (e.g. rt-003.attacker.com) never yields a
// tenant slug — mirroring the backend's HostnameSlug rule. The backend is the
// security boundary: it re-validates the hostname against the tenants table and
// the authenticated identity on every protected call.
export function getTenantSlugFromHost(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname.toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '::1') return null;
  const base = getTenantBaseDomain().toLowerCase();
  if (host === base) return null;
  const suffix = '.' + base;
  if (!host.endsWith(suffix)) return null;
  const sub = host.slice(0, -suffix.length);
  if (!sub || PLATFORM_SUBDOMAINS.has(sub)) return null;
  // Mirror the backend slug rule: lowercase alphanumerics with inner hyphens.
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sub)) return null;
  return sub;
}

// Platform pages (public portal on app.openrt.local / localhost / the base
// domain) fall back to the seeded default tenant so they keep working without a
// tenant subdomain.
export function getTenantSlugOrFallback(): string {
  return getTenantSlugFromHost() || DEFAULT_TENANT_SLUG;
}
