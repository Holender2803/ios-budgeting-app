import { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Category } from '../../types';
import { isPast, isSameMonth } from 'date-fns';

interface BudgetRow {
    id: string;
    category_id: string;
    monthly_limit: number;
}

interface BudgetCategoryListProps {
    budgets: BudgetRow[];
    categories: Category[];
    spentByCategory: Record<string, number>;
    selectedMonthStart: Date;
    onCategoryClick: (category: Category, spent: number, limit: number) => void;
}

export function BudgetCategoryList({ budgets, categories, spentByCategory, selectedMonthStart, onCategoryClick }: BudgetCategoryListProps) {
    const today = new Date();
    const isPastMonth = isPast(selectedMonthStart) && !isSameMonth(selectedMonthStart, today);

    // Sort budgets: highest percentage spent first, then by largest limit
    const sortedBudgets = useMemo(() => {
        return [...budgets].sort((a, b) => {
            const spentA = spentByCategory[a.category_id] || 0;
            const spentB = spentByCategory[b.category_id] || 0;
            const pctA = a.monthly_limit > 0 ? spentA / a.monthly_limit : 0;
            const pctB = b.monthly_limit > 0 ? spentB / b.monthly_limit : 0;

            if (pctA !== pctB) return pctB - pctA; // Highest % first
            return b.monthly_limit - a.monthly_limit; // Largest limit first
        });
    }, [budgets, spentByCategory]);

    if (sortedBudgets.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden font-dm-sans">
            {sortedBudgets.map((budget, index) => {
                const category = categories.find(c => c.id === budget.category_id);
                if (!category) return null;

                const spent = spentByCategory[category.id] || 0;
                const limit = budget.monthly_limit;
                const progressPercent = limit > 0 ? (spent / limit) * 100 : 0;
                const clampedProgress = Math.min(100, progressPercent);
                const isOverBudget = spent > limit;
                const isZero = spent === 0;
                const remaining = Math.max(0, limit - spent);

                // Determine bar color
                let barColorClass = "bg-[#10B981]"; // Green
                if (isZero) {
                    barColorClass = "bg-gray-300"; // Muted grey
                } else if (isOverBudget || progressPercent > 90) {
                    barColorClass = "bg-rose-400"; // Softer Coral/Rose tone
                } else if (progressPercent >= 70) {
                    barColorClass = "bg-[#F59E0B]"; // Amber
                }

                const IconComponent = (LucideIcons as any)[category.icon];

                return (
                    <button
                        key={budget.id}
                        onClick={() => onCategoryClick(category, spent, limit)}
                        className={`w-full text-left p-4 active:bg-gray-50 transition-colors ${index !== sortedBudgets.length - 1 ? 'border-b border-[#F1F5F9]' : ''
                            }`}
                    >
                        {/* Top Row: Icon, Name, Subtitle, Spent/Limit */}
                        <div className={`flex items-start gap-4 mb-3 ${isPastMonth ? 'opacity-60' : ''}`}>
                            {/* Icon */}
                            <div
                                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${category.color}20` }}
                            >
                                {IconComponent && (
                                    <IconComponent
                                        className="w-5 h-5"
                                        style={{ color: category.color }}
                                    />
                                )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-bold text-gray-900 truncate">
                                    {category.name}
                                </p>

                                <p className="text-[12px] mt-0.5">
                                    {isZero ? (
                                        <span className="text-gray-400 font-medium">No spending yet</span>
                                    ) : isPastMonth ? (
                                        isOverBudget ? (
                                            <span className="text-rose-500 font-medium">Finished over budget</span>
                                        ) : (
                                            <span className="text-green-600 font-medium">Finished under budget ✓</span>
                                        )
                                    ) : (
                                        isOverBudget ? (
                                            <span className="text-rose-500 font-medium">
                                                Over budget by ${Math.round(spent - limit).toLocaleString()}
                                            </span>
                                        ) : (
                                            <span className="text-gray-500 font-medium">
                                                {Math.round(progressPercent)}% used &middot; ${Math.round(remaining).toLocaleString()} left
                                            </span>
                                        )
                                    )}
                                </p>
                            </div>

                            {/* Amounts */}
                            <div className="text-right shrink-0">
                                <p className={`text-[15px] font-bold font-mono ${isZero ? 'text-gray-400' : 'text-gray-900'}`}>
                                    ${Math.round(spent).toLocaleString()}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    of ${Math.round(limit).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Bottom Row: Progress Bar */}
                        <div className={`w-full h-1.5 rounded-full bg-gray-100 overflow-hidden ${isPastMonth ? 'opacity-50' : ''}`}>
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${barColorClass}`}
                                style={{ width: `${clampedProgress}%` }}
                            />
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
