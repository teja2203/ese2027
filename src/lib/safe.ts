/* safe.ts — HTML escaping for user-derived strings.
   Fixes the legacy XSS vectors (task text, session titles,
   app/domain names were raw-interpolated). */

export function escapeHtml(v: unknown): string {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}