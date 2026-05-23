import { useMemo } from 'react';
import { filterTransactions, calcSummary } from '../utils/filterTransactions';

/**
 * Calculates income / expense / net totals for a given period.
 * Also returns category breakdown for expenses.
 */
export function usePeriodStats(transactions, categories, period = 'month') {
  const periodTxs = useMemo(
    () => filterTransactions(transactions, { period, excludeTransfers: true }),
    [transactions, period],
  );

  const { income, expense, net } = useMemo(() => calcSummary(periodTxs), [periodTxs]);

  const expenseByCat = useMemo(() => {
    const map = {};
    periodTxs.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([id, amount]) => {
        const cat = (categories?.expense || []).find(c => c.id === id);
        return { id, name: cat?.name || id, icon: cat?.icon || '💸', image: cat?.image, amount };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [periodTxs, categories]);

  return { periodTxs, income, expense, net, expenseByCat };
}
