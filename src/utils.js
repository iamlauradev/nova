// Parsea cantidades aceptando tanto coma como punto como separador decimal
export function parseAmount(value) {
  if (!value && value !== 0) return 0;
  const cleaned = String(value)
    .replace(',', '.')          // coma → punto
    .replace(/[^0-9.]/g, '');  // quitar todo lo demás
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100; // redondear a 2 decimales
}

// Formatea moneda en español
export function formatCurrency(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}

// Formatea fecha legible
export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Formatea fecha corta
export function formatDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}
