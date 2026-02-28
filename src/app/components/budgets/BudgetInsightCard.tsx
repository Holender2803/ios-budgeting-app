import { useMemo } from 'react';
import { getDaysInMonth, isSameMonth } from 'date-fns';
import { Category } from '../../types';
import { AlertCircle } from 'lucide-react';

interface BudgetRow {
    id: string;
    category_id: string;
    monthly_limit: number;
}

interface BudgetInsightCardProps {
    budgets: BudgetRow[];
    categories: Category[];
    spentByCategory: Record<string, number>;
    selectedMonthStart: Date;
}

export function BudgetInsightCard({ budgets, categories, spentByCategory, selectedMonthStart }: BudgetInsightCardProps) {
    const today = new Date();
    const isCurrent = isSameMonth(selectedMonthStart, today);

    // Only show insights for the current month
    if (!isCurrent) return null;

    const { worstCategory, worstOverage, daysLeft } = useMemo(() => {
        let maxOverage = 0;
        let cId: string | null = null;
        let cLimit = 0;
        let cSpent = 0;

        const totalDays = getDaysInMonth(selectedMonthStart);
        const elapsed = Math.max(1, today.getDate());

        // Don't calculate pace on the 1st of the month
        if (elapsed <= 1) return { worstCategory: null, worstOverage: 0, daysLeft: totalDays };

        budgets.forEach(b => {
            const spent = spentByCategory[b.category_id] || 0;
            const pace = (spent / elapsed) * totalDays;
            const overage = pace - b.monthly_limit;

            // We care if either: they are 80%+ already OR pacing to be over
            if (overage > maxOverage || (spent / b.monthly_limit) >= 0.8) {
                // Prioritize pacing overage over just being at 80% if there are multiple
                if (overage > maxOverage) {
                    maxOverage = overage;
                    cId = b.category_id;
                    cLimit = b.monthly_limit;
                    cSpent = spent;
                } else if (!cId) {
                    maxOverage = overage;
                    cId = b.category_id;
                    cLimit = b.monthly_limit;
                    cSpent = spent;
                }
            }
        });

        if (!cId) return { worstCategory: null, worstOverage: 0, daysLeft: totalDays - elapsed };

        const category = categories.find(c => c.id === cId);
        return {
            worstCategory: category ? { ...category, limit: cLimit, spent: cSpent } : null,
            worstOverage: Math.round(Math.max(0, maxOverage)),
            daysLeft: totalDays - elapsed
        };
    }, [budgets, categories, spentByCategory, selectedMonthStart, today]);

    if (!worstCategory) return null;

    const percentSpent = Math.round((worstCategory.spent / worstCategory.limit) * 100);

    return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 shadow-sm font-dm-sans">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-none mt-0.5">
                <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
                <p className="text-[14px] text-amber-900 leading-snug">
                    {daysLeft > 0 ? (
                        <>
                            <span className="font-bold">{worstCategory.name}</span> is at {percentSpent}% with {daysLeft} days left.
                            {worstOverage > 0 && (
                                <> You're on pace to exceed your limit by <span className="font-bold">~${worstOverage.toLocaleString()}</span>.</>
                            )}
                        </>
                    ) : (
                        <>
                            <span className="font-bold">{worstCategory.name}</span> reached {percentSpent}% of its limit this month.
                            {worstCategory.spent > worstCategory.limit && (
                                <> Monthly limit exceeded by <span className="font-bold">${Math.round(worstCategory.spent - worstCategory.limit).toLocaleString()}</span>.</>
                            )}
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}
