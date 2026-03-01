import { useMemo } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { PREMADE_VENDOR_NAMES, normalizeVendorText, sortVendorMatches } from '../constants/vendorIntelligence';

export function useVendorSuggestions(query: string, limit: number = 5) {
  const { transactions } = useExpense();

  const recentVendors = useMemo(() => {
    const vendors = new Map<string, { name: string; date: Date }>();

    [...transactions]
      .filter((t) => !t.deletedAt && !t.isVirtual)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach((t) => {
        const normalizedVendor = normalizeVendorText(t.vendor);
        if (!normalizedVendor || vendors.has(normalizedVendor)) {
          return;
        }
        vendors.set(normalizedVendor, { name: t.vendor, date: new Date(t.date) });
      });

    return Array.from(vendors.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((vendor) => vendor.name);
  }, [transactions]);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    return sortVendorMatches(query, [...PREMADE_VENDOR_NAMES, ...recentVendors], limit);
  }, [query, recentVendors, limit]);

  return { recentVendors, suggestions };
}
