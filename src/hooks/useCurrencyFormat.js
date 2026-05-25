import { useSettings } from '../context/SettingsContext';

/** Returns a formatCurrency function that respects the user's currency setting. */
export function useCurrencyFormat() {
  const { settings } = useSettings();
  const currency = settings.currency      || 'EUR';
  const locale   = settings.currencyLocale || 'es-ES';

  return (n) => new Intl.NumberFormat(locale, {
    style: 'currency', currency,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n ?? 0);
}
