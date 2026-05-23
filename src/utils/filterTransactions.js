/** Filters a transactions array by period, type, accountId, categoryId, tags and search.
 *  Returns a new sorted array (newest first).
 */
export function filterTransactions(transactions, {
  period     = 'all',
  type       = 'all',
  accountId  = null,
  categoryId = null,
  tag        = null,
  search     = '',
  categories = { income: [], expense: [] },
  excludeTransfers = false,
} = {}) {
  const now = new Date();
  let list = transactions;

  if (excludeTransfers) {
    list = list.filter(t => t.type !== 'transfer-in' && t.type !== 'transfer-out');
  }

  if (period !== 'all') {
    list = list.filter(t => {
      const d = new Date(t.date);
      if (period === 'week') {
        const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w;
      }
      if (period === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (period === 'quarter') {
        const q = new Date(now); q.setMonth(now.getMonth() - 3); return d >= q;
      }
      if (period === 'last') {
        const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear();
      }
      return true;
    });
  }

  if (type && type !== 'all') {
    if (type === 'transfer') list = list.filter(t => t.type === 'transfer-in' || t.type === 'transfer-out');
    else list = list.filter(t => t.type === type);
  }

  if (accountId)  list = list.filter(t => t.accountId === accountId);
  if (categoryId) list = list.filter(t => t.category  === categoryId);

  if (tag) {
    list = list.filter(t => (t.tags || '').split(',').map(s => s.trim()).includes(tag));
  }

  if (search && search.trim()) {
    const q = search.toLowerCase();
    const allCats = [...(categories.income || []), ...(categories.expense || [])];
    list = list.filter(t => {
      const cat = allCats.find(c => c.id === t.category);
      return (
        (t.description || '').toLowerCase().includes(q) ||
        (cat?.name || '').toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q) ||
        (t.tags || '').toLowerCase().includes(q) ||
        String(t.amount).includes(q.replace(',', '.'))
      );
    });
  }

  return list.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
}

/** Returns transactions for a specific calendar month (year, month 0-indexed), excluding transfers. */
export function txsForMonth(transactions, year, month) {
  return transactions.filter(t => {
    if (t.type === 'transfer-in' || t.type === 'transfer-out') return false;
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

/** Returns income and expense totals for a list of transactions. */
export function calcSummary(txs) {
  const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income, expense, net: income - expense };
}
