import { useState, useMemo, useEffect } from 'react';
import { filterTransactions } from '../utils/filterTransactions';

const PAGE_SIZE = 25;

/**
 * Encapsulates all filter state + pagination for TransactionsScreen.
 * Returns filtered + paginated results and filter state setters.
 */
export function useTransactionFilters(transactions, categories) {
  const [typeFilter,     setTypeFilter]     = useState('all');
  const [periodFilter,   setPeriodFilter]   = useState('month');
  const [accountFilter,  setAccountFilter]  = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [tagFilter,      setTagFilter]      = useState(null);
  const [search,         setSearch]         = useState('');
  const [visibleCount,   setVisibleCount]   = useState(PAGE_SIZE);

  // Reset pagination when filters change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [typeFilter, periodFilter, accountFilter, categoryFilter, tagFilter, search]);

  // Reset category filter when type changes
  useEffect(() => { setCategoryFilter(null); }, [typeFilter]);

  const filtered = useMemo(
    () => filterTransactions(transactions, {
      period:     periodFilter,
      type:       typeFilter,
      accountId:  accountFilter,
      categoryId: categoryFilter,
      tag:        tagFilter,
      search,
      categories,
    }),
    [transactions, typeFilter, periodFilter, accountFilter, categoryFilter, tagFilter, search, categories],
  );

  const visibleTxs = filtered.slice(0, visibleCount);
  const hasMore    = visibleCount < filtered.length;
  const loadMore   = () => { if (hasMore) setVisibleCount(c => c + PAGE_SIZE); };

  const totals = useMemo(() => {
    const inc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { inc, exp };
  }, [filtered]);

  return {
    filtered, visibleTxs, hasMore, loadMore, totals,
    typeFilter,     setTypeFilter,
    periodFilter,   setPeriodFilter,
    accountFilter,  setAccountFilter,
    categoryFilter, setCategoryFilter,
    tagFilter,      setTagFilter,
    search,         setSearch,
  };
}
