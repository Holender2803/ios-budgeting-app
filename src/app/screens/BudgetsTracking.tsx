import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, subMonths, format, isSameMonth } from 'date-fns';
import { BottomNav } from '../components/BottomNav';
import { MonthNavigator } from '../components/reports/MonthNavigator';
import { useExpense } from '../context/ExpenseContext';
import { toast } from 'sonner';
import { Target } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

import { BudgetHeroCard } from '../components/budgets/BudgetHeroCard';
import { BudgetInsightCard } from '../components/budgets/BudgetInsightCard';
import { BudgetCategoryList } from '../components/budgets/BudgetCategoryList';
import { BudgetCategorySheet } from '../components/budgets/BudgetCategorySheet';
import { Category } from '../types';

interface BudgetRow {
    id: string;
    category_id: string;
    monthly_limit: number;
}

export function BudgetsTracking() {
    const navigate = useNavigate();
    const { user, supabaseConfigured } = useAuth();
    const { transactions, categories } = useExpense();

    const [selectedMonthStart, setSelectedMonthStart] = useState<Date>(startOfMonth(new Date()));
    const [budgets, setBudgets] = useState<BudgetRow[]>([]);
    const [loadingBudgets, setLoadingBudgets] = useState(true);

    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetCategory, setSheetCategory] = useState<Category | null>(null);
    const [sheetSpent, setSheetSpent] = useState(0);
    const [sheetLimit, setSheetLimit] = useState(0);
    const showInsightCard = isSameMonth(selectedMonthStart, new Date());

    // Fetch budgets from Supabase
    useEffect(() => {
        const loadBudgets = async () => {
            if (!supabaseConfigured || !supabase || !user) {
                setLoadingBudgets(false);
                return;
            }

            setLoadingBudgets(true);
            try {
                const { data, error } = await supabase
                    .from('budgets')
                    .select('id, category_id, monthly_limit')
                    .eq('user_id', user.id);

                if (error) throw error;

                const rows: BudgetRow[] = (data || []).map((row: any) => ({
                    id: row.id,
                    category_id: row.category_id,
                    monthly_limit: typeof row.monthly_limit === 'string'
                        ? parseFloat(row.monthly_limit)
                        : row.monthly_limit,
                }));
                setBudgets(rows);
            } catch (err: any) {
                console.error('Failed to load budgets tracking', err);
                toast.error('Failed to load budgets');
            } finally {
                setLoadingBudgets(false);
            }
        };

        loadBudgets();
    }, [supabaseConfigured, user?.id]);

    // Calculate spent amounts for the selected month
    const { monthSpent, spentByCategory } = useMemo(() => {
        let monthTotal = 0;
        const byCat: Record<string, number> = {};

        // Initialize all budgeted categories with 0
        budgets.forEach(b => {
            byCat[b.category_id] = 0;
        });

        const monthEnd = endOfMonth(selectedMonthStart);

        transactions.forEach(t => {
            // Ignore recurring expenses per requirements
            if (t.isRecurring) return;

            const tDate = parseISO(t.date);
            if (isWithinInterval(tDate, { start: selectedMonthStart, end: monthEnd })) {
                // Only count spending for categories that have budgets
                if (t.category && byCat[t.category] !== undefined) {
                    byCat[t.category] += t.amount;
                    monthTotal += t.amount;
                }
            }
        });

        return { monthSpent: monthTotal, spentByCategory: byCat };
    }, [transactions, selectedMonthStart, budgets]);

    // Calculate total limits
    const totalLimit = useMemo(() => {
        return budgets.reduce((sum, b) => sum + b.monthly_limit, 0);
    }, [budgets]);

    // Calculate previous month total spent
    const previousMonthTotal = useMemo(() => {
        const prevStart = startOfMonth(subMonths(selectedMonthStart, 1));
        const prevEnd = endOfMonth(prevStart);
        let total = 0;

        // Sum only categories that are tracked in budgets
        transactions.forEach(t => {
            if (t.isRecurring) return;
            const hasBudget = budgets.some(b => b.category_id === t.category);
            if (!hasBudget) return;

            const tDate = parseISO(t.date);
            if (isWithinInterval(tDate, { start: prevStart, end: prevEnd })) {
                total += t.amount;
            }
        });
        return total;
    }, [transactions, selectedMonthStart, budgets]);

    if (loadingBudgets) {
        return (
            <div className="app-screen-with-nav h-[100dvh] flex flex-col bg-[#F1F5F9] overflow-hidden relative font-dm-sans">
                <div className="flex-1 flex justify-center items-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
                </div>
                <div className="flex-none bg-white border-t border-gray-100 z-20 lg:h-0 lg:border-t-0 lg:bg-transparent">
                    <BottomNav />
                </div>
            </div>
        );
    }

    // Empty state - No budgets configured
    if (budgets.length === 0) {
        return (
            <div className="app-screen-with-nav h-[100dvh] flex flex-col bg-[#F1F5F9] overflow-hidden relative font-dm-sans">
                <div className="flex-1 overflow-y-auto">
                    <div className="app-shell-wide pt-6 pb-32 flex flex-col items-center justify-center text-center min-h-full">
                        <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-4">
                            <Target className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">No budgets set yet</h2>
                        <p className="text-gray-500 text-sm max-w-[250px] mb-8 leading-relaxed">
                            Set monthly limits to start tracking your spending and stay on top of your finances.
                        </p>
                        <button
                            onClick={() => navigate('/settings/budgets')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full shadow-md active:scale-95 transition-all"
                        >
                            Set Up Budgets
                        </button>
                    </div>
                </div>
                <div className="flex-none bg-white border-t border-gray-100 z-20 lg:h-0 lg:border-t-0 lg:bg-transparent">
                    <BottomNav />
                </div>
            </div>
        );
    }

    return (
        <div className="app-screen-with-nav h-[100dvh] flex flex-col bg-[#F1F5F9] overflow-hidden relative font-dm-sans">
            {/* Sticky Header */}
            <div className="flex-none bg-white border-b border-gray-100 z-30 relative shadow-sm">
                <div className="app-shell-wide pt-12 pb-2">
                    <MonthNavigator
                        currentMonth={selectedMonthStart}
                        onChange={setSelectedMonthStart}
                    />
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="app-shell-wide py-6 pb-32">
                    <div className="space-y-4 lg:grid lg:grid-cols-12 lg:gap-4 lg:space-y-0">
                        <div className="lg:col-span-12">
                            <BudgetHeroCard
                                monthSpent={monthSpent}
                                totalLimit={totalLimit}
                                selectedMonthStart={selectedMonthStart}
                            />
                        </div>

                        {showInsightCard && (
                            <div className="lg:col-span-4">
                                <BudgetInsightCard
                                    budgets={budgets}
                                    categories={categories}
                                    spentByCategory={spentByCategory}
                                    selectedMonthStart={selectedMonthStart}
                                />
                            </div>
                        )}

                        <div className={showInsightCard ? 'lg:col-span-8' : 'lg:col-span-12'}>
                            <BudgetCategoryList
                                budgets={budgets}
                                categories={categories}
                                spentByCategory={spentByCategory}
                                selectedMonthStart={selectedMonthStart}
                                onCategoryClick={(category, spent, limit) => {
                                    setSheetCategory(category);
                                    setSheetSpent(spent);
                                    setSheetLimit(limit);
                                    setSheetOpen(true);
                                }}
                            />
                        </div>

                        {/* Comparison Row */}
                        {previousMonthTotal > 0 && (
                            <div className="bg-white rounded-[20px] p-4 flex items-center justify-between border border-gray-100 shadow-sm font-dm-sans lg:col-span-12">
                                <span className="text-[14px] font-medium text-gray-600">
                                    vs {format(subMonths(selectedMonthStart, 1), 'MMMM')}
                                </span>
                                <div className="flex items-center gap-2">
                                    {monthSpent < previousMonthTotal ? (
                                        <div className="flex items-center gap-1.5 text-green-600">
                                            <span className="text-[14px] font-bold">
                                                ${Math.round(previousMonthTotal - monthSpent).toLocaleString()} less
                                            </span>
                                            <span className="text-[12px]">↓</span>
                                        </div>
                                    ) : monthSpent > previousMonthTotal ? (
                                        <div className="flex items-center gap-1.5 text-red-500">
                                            <span className="text-[14px] font-bold">
                                                ${Math.round(monthSpent - previousMonthTotal).toLocaleString()} more
                                            </span>
                                            <span className="text-[12px]">↑</span>
                                        </div>
                                    ) : (
                                        <span className="text-[14px] font-bold text-gray-500">
                                            Same spending
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 pb-8 flex justify-center lg:col-span-12">
                            <button
                                onClick={() => navigate('/settings/budgets')}
                                className="text-[13px] text-gray-500 hover:text-gray-700 font-medium transition-colors"
                            >
                                Edit budget limits &rarr;
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Frozen Footer */}
            <div className="flex-none bg-white border-t border-gray-100 z-20 lg:h-0 lg:border-t-0 lg:bg-transparent">
                <BottomNav />
            </div>

            <BudgetCategorySheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                category={sheetCategory}
                selectedMonthStart={selectedMonthStart}
                transactions={transactions}
                monthSpent={sheetSpent}
                monthLimit={sheetLimit}
            />
        </div>
    );
}
