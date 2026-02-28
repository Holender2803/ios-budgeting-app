import { useMemo } from 'react';
import { useExpense } from '../context/ExpenseContext';

export function useVendorSuggestions(query: string, limit: number = 5) {
  const { transactions } = useExpense();

  const recentVendors = useMemo(() => {
    const vendors = new Map<string, Date>();

    [...transactions]
      .filter((t) => !t.deletedAt)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach((t) => {
        if (!vendors.has(t.vendor)) {
          vendors.set(t.vendor, new Date(t.date));
        }
      });

    return Array.from(vendors.keys());
  }, [transactions]);

  const suggestions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];

    return recentVendors
      .filter((v) => {
        const lower = v.toLowerCase();
        return lower.includes(term) && lower !== term;
      })
      .slice(0, limit);
  }, [query, recentVendors, limit]);

  return { recentVendors, suggestions };
}

