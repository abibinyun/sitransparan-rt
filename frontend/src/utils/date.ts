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
