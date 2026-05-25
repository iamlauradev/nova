/** Parses a Spanish-format amount string ("12,50" or "12.50") into a number. */
export function parseAmount(value: string | number | null | undefined): number {
  if (!value && value !== 0) return 0;
  const cleaned = String(value)
    .replace(',', '.')
    .replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

let _currency = 'EUR';
let _locale   = 'es-ES';

/** Called by SettingsContext when the user changes their currency preference. */
export function configureCurrency(currency: string, locale: string) {
  _currency = currency;
  _locale   = locale;
}

/** Formats a number using the user's configured currency and locale. */
export function formatCurrency(n: number | null | undefined): string {
  return new Intl.NumberFormat(_locale, {
    style: 'currency',
    currency: _currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}

/** Formats an ISO date string as a readable Spanish date. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Formats an ISO date string as a short Spanish date (day + month). */
export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}
