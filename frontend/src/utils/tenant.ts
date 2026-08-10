export function getTenantSlugFromHost(): string {
  if (typeof window === 'undefined') return 'sitransparan-rt';
  
  const host = window.location.hostname;
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === 'app.openrt.local' || host === 'api.openrt.local') {
    return 'sitransparan-rt';
  }

  const parts = host.split('.');
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub !== 'app' && sub !== 'api') {
      return sub;
    }
  }

  return 'sitransparan-rt';
}
