/**
 * Convert a date-only string (YYYY-MM-DD) produced by an <input type="date">
 * into an RFC3339 timestamp the backend's time.Time fields accept, or
 * undefined when empty (so the field is omitted instead of sending an empty
 * string that fails JSON decoding).
 */
export function dateOnlyToISO(dateOnly?: string): string | undefined {
  if (!dateOnly) return undefined;
  return `${dateOnly}T00:00:00Z`;
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffSec < 60) return 'Baru saja';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
  return formatDate(dateString);
}
