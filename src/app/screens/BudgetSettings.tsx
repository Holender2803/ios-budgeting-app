import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import * as LucideIcons from 'lucide-react';
import { ChevronLeft, ChevronRight, Sparkles, Info, X, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseISO, subMonths, isAfter, startOfDay, format } from 'date-fns';
import { toast } from 'sonner';

import { useExpense, CANONICAL_GROUPS } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { ensureSystemCategories } from '../../lib/systemCategorySync';
import type { Category, Transaction } from '../types';

interface BudgetRow {
  id: string;
  category_id: string;
  monthly_limit: number;
}

type SuggestionsMap = Record<string, number>;

export function BudgetSettings() {
  const navigate = useNavigate();
  const { categories, transactions } = useExpense();
  const { user, supabaseConfigured } = useAuth();

  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);

  const [suggestions, setSuggestions] = useState<SuggestionsMap>({});

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetCategory, setSheetCategory] = useState<Category | null>(null);
  const [sheetValue, setSheetValue] = useState<string>('');
  const [sheetSaving, setSheetSaving] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<
    { monthKey: string; total: number }[]
  >([]);
  const [historyAverage, setHistoryAverage] = useState<number | null>(null);

  const [applyingAll, setApplyingAll] = useState(false);

  const primaryInputRef = useRef<HTMLInputElement>(null);
  const [primaryInputFocused, setPrimaryInputFocused] = useState(false);

  const hasSuggestions = Object.keys(suggestions).length > 0;

  const spendLessValue = useMemo(() => {
    if (historyAverage == null) return null;
    const raw = Math.floor((historyAverage * 0.75) / 5) * 5;
    return Math.round(raw <= 0 ? 5 : raw);
  }, [historyAverage]);

  const avgRounded = historyAverage != null ? Math.round(historyAverage) : null;

  const budgetByCategory = useMemo(() => {
    const map: Record<string, BudgetRow> = {};
    for (const b of budgets) {
      map[b.category_id] = b;
    }
    return map;
  }, [budgets]);

  // Compute smart suggestions from the last 3 months of non-recurring expenses
  useEffect(() => {
    const next: SuggestionsMap = {};

    if (!transactions || transactions.length === 0) {
      setSuggestions(next);
      return;
    }

    const threeMonthsAgo = subMonths(startOfDay(new Date()), 3);

    // categoryId -> monthKey -> sum
    const perMonthTotals = new Map<string, Map<string, number>>();

    const addToTotals = (tx: Transaction) => {
      if (tx.isRecurring) return;
      if ((tx as any).isVirtual) return;
      if ((tx as any).deletedAt) return;

      const date = parseISO(tx.date);
      if (!isAfter(date, threeMonthsAgo) && date.getTime() !== threeMonthsAgo.getTime()) {
        return;
      }

      const categoryId = tx.category;
      if (!categoryId) return;

      const monthKey = format(date, 'yyyy-MM-01');
      if (!perMonthTotals.has(categoryId)) {
        perMonthTotals.set(categoryId, new Map());
      }
      const monthMap = perMonthTotals.get(categoryId)!;
      const prev = monthMap.get(monthKey) ?? 0;
      monthMap.set(monthKey, prev + tx.amount);
    };

    transactions.forEach(addToTotals);

    perMonthTotals.forEach((monthMap, categoryId) => {
      const monthTotals = Array.from(monthMap.values());
      const monthsWithData = monthTotals.length;
      if (monthsWithData >= 2) {
        const sum = monthTotals.reduce((acc, v) => acc + v, 0);
        const avg = sum / monthsWithData;
        if (avg > 0) {
          next[categoryId] = avg;
        }
      }
    });

    setSuggestions(next);
  }, [transactions]);

  // Load budgets from Supabase when available
  useEffect(() => {
    const loadBudgets = async () => {
      if (!supabaseConfigured || !supabase || !user) return;
      setLoadingBudgets(true);
      try {
        await ensureSystemCategories(user.id);

        const { data, error } = await supabase
          .from('budgets')
          .select('id, category_id, monthly_limit')
          .eq('user_id', user.id);

        if (error) throw error;

        const rows: BudgetRow[] = (data || []).map((row: any) => ({
          id: row.id,
          category_id: row.category_id,
          monthly_limit:
            typeof row.monthly_limit === 'string'
              ? parseFloat(row.monthly_limit)
              : row.monthly_limit,
        }));
        setBudgets(rows);
      } catch (err: any) {
        console.error('Failed to load budgets', err);
        toast.error('Failed to load budgets');
      } finally {
        setLoadingBudgets(false);
      }
    };

    loadBudgets();
  }, [supabaseConfigured, user?.id]);

  const loadHistoryForCategory = (categoryId: string) => {
    setHistoryLoading(true);
    setHistoryRows([]);
    setHistoryAverage(null);

    const threeMonthsAgo = subMonths(startOfDay(new Date()), 3);
    const perMonthTotals = new Map<string, number>();

    transactions.forEach((tx: Transaction) => {
      if (tx.category !== categoryId) return;
      if (tx.isRecurring) return;
      if ((tx as any).isVirtual) return;
      if ((tx as any).deletedAt) return;

      const date = parseISO(tx.date);
      if (!isAfter(date, threeMonthsAgo) && date.getTime() !== threeMonthsAgo.getTime()) {
        return;
      }

      const monthKey = format(date, 'yyyy-MM-01');
      const prev = perMonthTotals.get(monthKey) ?? 0;
      // Ensure numeric with parseFloat before storing
      perMonthTotals.set(monthKey, parseFloat((prev + tx.amount).toString()));
    });

    const entries = Array.from(perMonthTotals.entries())
      .map(([monthKey, total]) => ({
        monthKey,
        total: parseFloat(total.toString()),
      }))
      .sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1)) // newest first
      .slice(0, 3);

    setHistoryRows(entries);

    if (entries.length >= 2) {
      const totals = entries.map((e) => parseFloat(e.total.toString()));
      const avg =
        totals.reduce((acc, v) => acc + v, 0) / (totals.length || 1);
      setHistoryAverage(avg);
    } else {
      setHistoryAverage(null);
    }

    setHistoryLoading(false);
  };

  const openSheetForCategory = (category: Category) => {
    const existing = budgetByCategory[category.id];
    setSheetCategory(category);
    setSheetValue(
      existing ? Math.round(existing.monthly_limit).toString() : ''
    );
    setSheetOpen(true);
    loadHistoryForCategory(category.id);
  };

  const closeSheet = () => {
    if (sheetSaving) return;
    setSheetOpen(false);
    setSheetCategory(null);
    setSheetValue('');
    setHistoryRows([]);
    setHistoryAverage(null);
    setPrimaryInputFocused(false);
  };

  const parseAmount = (value: string): number | null => {
    const cleaned = value.replace(/,/g, '').trim();
    if (!cleaned) return null;
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };

  const handleSaveBudget = async () => {
    if (!supabaseConfigured || !supabase || !user || !sheetCategory) return;

    const amount = parseAmount(sheetValue);
    if (amount === null) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSheetSaving(true);
    try {
      await ensureSystemCategories(user.id);

      const payload = {
        user_id: user.id,
        category_id: sheetCategory.id,
        monthly_limit: amount,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('budgets')
        .upsert(payload, { onConflict: 'user_id,category_id' })
        .select('id, category_id, monthly_limit');

      if (error) throw error;

      const rows: BudgetRow[] = (data || []).map((row: any) => ({
        id: row.id,
        category_id: row.category_id,
        monthly_limit:
          typeof row.monthly_limit === 'string'
            ? parseFloat(row.monthly_limit)
            : row.monthly_limit,
      }));

      setBudgets((prev) => {
        const byCat = new Map<string, BudgetRow>();
        prev.forEach((b) => byCat.set(b.category_id, b));
        rows.forEach((b) => byCat.set(b.category_id, b));
        return Array.from(byCat.values());
      });

      toast.success('Budget saved');
      closeSheet();
    } catch (err: any) {
      console.error('Failed to save budget', err);
      toast.error(err?.message ? `Failed to save budget: ${err.message}` : 'Failed to save budget');
    } finally {
      setSheetSaving(false);
    }
  };

  const handleRemoveBudget = async () => {
    if (!supabaseConfigured || !supabase || !user || !sheetCategory) return;

    const existing = budgetByCategory[sheetCategory.id];
    if (!existing) {
      closeSheet();
      return;
    }

    const confirmed = window.confirm(
      `Remove budget for ${sheetCategory.name}? This won't affect your expense history.`
    );
    if (!confirmed) return;

    setSheetSaving(true);
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('user_id', user.id)
        .eq('category_id', sheetCategory.id);

      if (error) throw error;

      setBudgets((prev) =>
        prev.filter((b) => b.category_id !== sheetCategory.id)
      );
      toast.success('Budget removed');
      closeSheet();
    } catch (err: any) {
      console.error('Failed to remove budget', err);
      toast.error('Failed to remove budget');
    } finally {
      setSheetSaving(false);
    }
  };

  const handleApplySuggestionForCategory = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;
    const suggested = suggestions[categoryId];
    if (!supabaseConfigured || !supabase || !user || !suggested) return;

    try {
      await ensureSystemCategories(user.id);

      const payload = {
        user_id: user.id,
        category_id: categoryId,
        monthly_limit: Math.round(suggested),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('budgets')
        .upsert(payload, { onConflict: 'user_id,category_id' })
        .select('id, category_id, monthly_limit');

      if (error) throw error;

      const rows: BudgetRow[] = (data || []).map((row: any) => ({
        id: row.id,
        category_id: row.category_id,
        monthly_limit:
          typeof row.monthly_limit === 'string'
            ? parseFloat(row.monthly_limit)
            : row.monthly_limit,
      }));

      setBudgets((prev) => {
        const byCat = new Map<string, BudgetRow>();
        prev.forEach((b) => byCat.set(b.category_id, b));
        rows.forEach((b) => byCat.set(b.category_id, b));
        return Array.from(byCat.values());
      });

      toast.success(`Applied suggestion for ${category.name}`);
    } catch (err: any) {
      console.error('Failed to apply suggestion', err);
      toast.error(err?.message ? `Failed to apply suggestion: ${err.message}` : 'Failed to apply suggestion');
    }
  };

  const handleApplyAllSuggestions = async () => {
    if (!supabaseConfigured || !supabase || !user) return;
    const entries = Object.entries(suggestions);
    if (entries.length === 0) return;

    setApplyingAll(true);
    try {
      await ensureSystemCategories(user.id);

      const payload = entries.map(([categoryId, amount]) => ({
        user_id: user.id,
        category_id: categoryId,
        monthly_limit: Math.round(amount),
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('budgets')
        .upsert(payload, { onConflict: 'user_id,category_id' })
        .select('id, category_id, monthly_limit');

      if (error) throw error;

      const rows: BudgetRow[] = (data || []).map((row: any) => ({
        id: row.id,
        category_id: row.category_id,
        monthly_limit:
          typeof row.monthly_limit === 'string'
            ? parseFloat(row.monthly_limit)
            : row.monthly_limit,
      }));

      setBudgets((prev) => {
        const byCat = new Map<string, BudgetRow>();
        prev.forEach((b) => byCat.set(b.category_id, b));
        rows.forEach((b) => byCat.set(b.category_id, b));
        return Array.from(byCat.values());
      });

      toast.success('Applied all smart suggestions');
    } catch (err: any) {
      console.error('Failed to apply all suggestions', err);
      toast.error(err?.message ? `Failed to apply all suggestions: ${err.message}` : 'Failed to apply all suggestions');
    } finally {
      setApplyingAll(false);
    }
  };

  const formatCurrency = (value: number) =>
    `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

  const formatWholeNumber = (raw: string) => {
    if (!raw) return '';
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n.toLocaleString() : '';
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setSheetValue(raw);
  };

  if (!supabaseConfigured || !user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Budget Settings
                </h1>
                <p className="text-sm text-gray-500">
                  Set monthly limits per category
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-none">
              <Info className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Budgets require an account
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Sign in and connect Supabase to sync your budgets across devices.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Budget Settings
              </h1>
              <p className="text-sm text-gray-500">
                Set monthly limits per category
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Smart Suggestions Banner */}
        {hasSuggestions ? (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-none">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">
                Smart Suggestions available
              </p>
              <p className="text-xs text-blue-800 mt-1">
                Based on your last 3 months of spending
              </p>
              <button
                type="button"
                onClick={handleApplyAllSuggestions}
                disabled={applyingAll || loadingBudgets}
                className="mt-3 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {applyingAll ? 'Applying…' : 'Apply All Suggestions'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 border border-gray-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-none">
              <Info className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Smart suggestions unlock after 2 months of tracking
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Keep logging expenses to unlock this feature.
              </p>
            </div>
          </div>
        )}

        {/* Category List */}
        <div className="space-y-4">
          {CANONICAL_GROUPS.filter((group) =>
            categories.some((c) => c.group === group)
          ).map((group) => (
            <div key={group} className="space-y-2">
              <h3 className="px-1 text-[10px] font-bold text-gray-400 uppercase tracking-[0.18em]">
                {group}
              </h3>

              <div className="space-y-2">
                {categories
                  .filter((c) => c.group === group)
                  .map((category) => {
                    const IconComponent = (LucideIcons as any)[category.icon];
                    const budget = budgetByCategory[category.id];
                    const suggested = !budget ? suggestions[category.id] : undefined;

                    return (
                      <motion.button
                        key={category.id}
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => openSheetForCategory(category)}
                        className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-transparent hover:border-gray-200 transition-all text-left"
                      >
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                          style={{ backgroundColor: `${category.color}20` }}
                        >
                          {IconComponent && (
                            <IconComponent
                              className="w-6 h-6"
                              style={{ color: category.color }}
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-gray-900">
                              {category.name}
                            </p>
                            {budget && (
                              <p className="text-sm font-semibold text-blue-600 whitespace-nowrap">
                                {formatCurrency(budget.monthly_limit)} / mo
                              </p>
                            )}
                          </div>

                          <div className="mt-1 min-h-[20px]">
                            {suggested ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplySuggestionForCategory(category.id);
                                }}
                                className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 active:scale-95 transition"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Suggested {formatCurrency(suggested)}</span>
                              </button>
                            ) : !budget ? (
                              <p className="text-[13px] font-medium text-slate-400">
                                + Set limit
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                      </motion.button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Budget Bottom Sheet */}
      <AnimatePresence>
        {sheetOpen && sheetCategory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSheet}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-50 flex flex-col font-sans shadow-2xl safe-area-bottom max-h-[85vh]"
            >
              <div className="flex-none p-6 pb-4 border-b border-gray-100 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-[12px] flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: sheetCategory.color + '20' }}
                  >
                    {(() => {
                      const IconComponent = (LucideIcons as any)[sheetCategory.icon];
                      return IconComponent ? (
                        <IconComponent
                          className="w-5 h-5"
                          style={{ color: sheetCategory.color }}
                        />
                      ) : (
                        <div
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: sheetCategory.color }}
                        />
                      );
                    })()}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                      {sheetCategory.name}
                    </h2>
                    <p className="text-[13px] text-gray-500 mt-0.5">
                      Monthly budget
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeSheet}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4 space-y-5">
                {/* History Section */}
                <div className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 mb-3">
                    YOUR LAST 3 MONTHS
                  </p>

                  {historyLoading ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-4"
                        >
                          <div className="h-3 w-16 rounded-full bg-slate-200 animate-pulse" />
                          <div className="flex-1 max-w-[80px] h-3 rounded-full bg-slate-200 animate-pulse" />
                          <div className="h-3 w-12 rounded-full bg-slate-200 animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : historyRows.length >= 2 ? (
                    <>
                      <div className="space-y-3">
                        {(() => {
                          const maxTotal =
                            historyRows.reduce(
                              (max, r) =>
                                r.total > max ? r.total : max,
                              0
                            ) || 1;

                          return historyRows.map((row) => {
                            const monthDate = parseISO(row.monthKey);
                            const monthLabel = format(monthDate, 'MMMM');
                            const ratio =
                              maxTotal > 0
                                ? Math.min(
                                    1,
                                    parseFloat(
                                      (row.total / maxTotal).toString()
                                    )
                                  )
                                : 0;

                            return (
                              <div
                                key={row.monthKey}
                                className="flex items-center justify-between gap-3"
                              >
                                <span className="text-[13px] text-slate-700">
                                  {monthLabel}
                                </span>
                                <div className="flex-1 max-w-[80px] h-4 flex items-center">
                                  <div className="w-full h-1.5 rounded-full bg-indigo-50 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-blue-600"
                                      style={{ width: `${ratio * 100}%` }}
                                    />
                                  </div>
                                </div>
                                <span className="text-[13px] font-semibold text-slate-900 font-mono">
                                  {formatCurrency(row.total)}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      <div className="h-px bg-[#E2E8F0] my-3" />

                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-[#64748B]">
                          3-month avg
                        </span>
                        {historyAverage !== null && (
                          <span className="text-[12px] text-[#64748B]">
                            {formatCurrency(historyAverage)} / mo
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center px-2 py-2">
                      <p className="text-[13px] font-semibold text-slate-500">
                        Not enough data yet
                      </p>
                      <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">
                        Log 2+ months of expenses in this category to unlock smart
                        suggestions.
                      </p>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-[#E2E8F0]" />

                {/* Segmented Control + Primary Input + Range Slider */}
                {(() => {
                  const parsed = parseAmount(sheetValue);
                  const matchesAvg =
                    avgRounded != null &&
                    parsed !== null &&
                    Math.round(parsed) === avgRounded;
                  const matchesLess =
                    spendLessValue != null &&
                    parsed !== null &&
                    Math.round(parsed) === spendLessValue;
                  const activeTab: 'useAvg' | 'spendLess' | 'custom' =
                    matchesAvg ? 'useAvg' : matchesLess ? 'spendLess' : 'custom';

                  const historyMin =
                    historyRows.length > 0
                      ? Math.round(
                          Math.min(...historyRows.map((r) => r.total))
                        )
                      : 0;
                  const historyMax =
                    historyRows.length > 0
                      ? Math.round(
                          Math.max(...historyRows.map((r) => r.total))
                        )
                      : 0;
                  const currentVal = parsed ?? 0;
                  const rangeSpan = historyMax - historyMin || 1;
                  const dotPosition =
                    historyMin === historyMax
                      ? 50
                      : Math.min(
                          100,
                          Math.max(
                            0,
                            ((currentVal - historyMin) / rangeSpan) * 100
                          )
                        );

                  return (
                    <div className="space-y-4">
                      <p
                        className="text-[11px] font-semibold tracking-[0.12em] uppercase"
                        style={{ color: '#64748B' }}
                      >
                        SET YOUR BUDGET
                      </p>

                      {historyAverage != null && spendLessValue != null ? (
                        <>
                          {/* Segmented Control */}
                          <div className="flex rounded-xl bg-slate-100 p-1">
                            <button
                              type="button"
                              onClick={() =>
                                setSheetValue(avgRounded!.toString())
                              }
                              className={`flex-1 flex flex-col items-center justify-center gap-0.5 rounded-[10px] py-2.5 px-2 transition ${
                                activeTab === 'useAvg'
                                  ? 'bg-white shadow-sm border border-[#2563EB]'
                                  : 'bg-transparent'
                              }`}
                            >
                              <span
                                className={`text-[11px] ${
                                  activeTab === 'useAvg'
                                    ? 'text-[#2563EB] font-semibold'
                                    : 'text-[#64748B]'
                                }`}
                              >
                                Use Average
                              </span>
                              <span
                                className={`text-[12px] font-bold ${
                                  activeTab === 'useAvg'
                                    ? 'text-[#2563EB]'
                                    : 'text-[#64748B]'
                                }`}
                              >
                                {formatCurrency(avgRounded!)}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setSheetValue(spendLessValue!.toString())
                              }
                              className={`flex-1 flex flex-col items-center justify-center gap-0.5 rounded-[10px] py-2.5 px-2 transition ${
                                activeTab === 'spendLess'
                                  ? 'bg-white shadow-sm border border-[#2563EB]'
                                  : 'bg-transparent'
                              }`}
                            >
                              <span
                                className={`text-[11px] ${
                                  activeTab === 'spendLess'
                                    ? 'text-[#2563EB] font-semibold'
                                    : 'text-[#64748B]'
                                }`}
                              >
                                Spend Less
                              </span>
                              <span
                                className={`text-[12px] font-bold ${
                                  activeTab === 'spendLess'
                                    ? 'text-[#2563EB]'
                                    : 'text-[#64748B]'
                                }`}
                              >
                                {formatCurrency(spendLessValue!)}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => primaryInputRef.current?.focus()}
                              className={`flex-1 flex flex-col items-center justify-center gap-0.5 rounded-[10px] py-2.5 px-2 transition ${
                                activeTab === 'custom'
                                  ? 'bg-white shadow-sm border border-[#2563EB]'
                                  : 'bg-transparent'
                              }`}
                            >
                              <span
                                className={`text-[11px] ${
                                  activeTab === 'custom'
                                    ? 'text-[#2563EB] font-semibold'
                                    : 'text-[#64748B]'
                                }`}
                              >
                                Custom
                              </span>
                            </button>
                          </div>

                          {/* Primary Input Field */}
                          <div
                            className={`flex items-center gap-3 rounded-xl border-[1.5px] bg-white px-4 py-4 transition ${
                              primaryInputFocused
                                ? 'border-[#2563EB]'
                                : 'border-[#E2E8F0]'
                            }`}
                          >
                            <span className="text-[24px] font-bold text-[#94A3B8]">
                              $
                            </span>
                            <input
                              ref={primaryInputRef}
                              type="text"
                              inputMode="numeric"
                              value={formatWholeNumber(sheetValue)}
                              onChange={handleCustomInputChange}
                              onFocus={() => setPrimaryInputFocused(true)}
                              onBlur={() => setPrimaryInputFocused(false)}
                              placeholder="0"
                              className="flex-1 min-w-0 bg-transparent text-[24px] font-bold text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <Pencil className="w-5 h-5 text-[#94A3B8] shrink-0" />
                          </div>

                          {/* Range Slider (visual benchmark) */}
                          <div className="space-y-2">
                            <div className="relative h-2 rounded-full bg-slate-100">
                              <div
                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#2563EB] shadow-md transition-all duration-150"
                                style={{ left: `calc(${dotPosition}% - 6px)` }}
                              />
                            </div>
                            <div className="flex justify-between text-[11px] text-[#64748B]">
                              <span>Min ({formatCurrency(historyMin)})</span>
                              <span>Max ({formatCurrency(historyMax)})</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <div
                            className={`flex items-center gap-3 rounded-xl border-[1.5px] bg-white px-4 py-4 transition ${
                              primaryInputFocused
                                ? 'border-[#2563EB]'
                                : 'border-[#E2E8F0]'
                            }`}
                          >
                            <span className="text-[24px] font-bold text-[#94A3B8]">
                              $
                            </span>
                            <input
                              ref={primaryInputRef}
                              type="text"
                              inputMode="numeric"
                              value={formatWholeNumber(sheetValue)}
                              onChange={handleCustomInputChange}
                              onFocus={() => setPrimaryInputFocused(true)}
                              onBlur={() => setPrimaryInputFocused(false)}
                              placeholder="0"
                              className="flex-1 min-w-0 bg-transparent text-[24px] font-bold text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <Pencil className="w-5 h-5 text-[#94A3B8] shrink-0" />
                          </div>
                          <p className="text-center text-[12px] text-slate-500">
                            Set any amount to get started
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="flex-none px-6 pb-6 pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleSaveBudget}
                  disabled={sheetSaving}
                  className="w-full h-12 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {sheetSaving ? 'Saving…' : 'Save Budget'}
                </button>

                {budgetByCategory[sheetCategory.id] && (
                  <button
                    type="button"
                    onClick={handleRemoveBudget}
                    disabled={sheetSaving}
                    className="w-full h-10 text-sm font-semibold text-red-600"
                  >
                    Remove Budget
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
