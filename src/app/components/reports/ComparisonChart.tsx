import { useMemo } from 'react';
import { Transaction, Category } from '../../types';
import { differenceInMonths, parseISO, isWithinInterval, subMonths } from 'date-fns';
import { TimePeriod } from './PeriodSelector';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { motion } from 'motion/react';

interface ComparisonChartProps {
    transactions: Transaction[]; // this needs to be ALL filtered transactions, not just the period ones
    categories: Category[];
    dateRange: { start: Date; end: Date };
    timePeriod: TimePeriod;
}

export function ComparisonChart({ transactions, categories, dateRange, timePeriod }: ComparisonChartProps) {
    // Hide in week mode or custom mode
    if (timePeriod === 'Week' || timePeriod === 'Custom') return null;

    const comparisonData = useMemo(() => {
        // Determine the "previous" period based on the current period's length
        const monthsDiff = Math.max(1, differenceInMonths(dateRange.end, dateRange.start) + 1);

        // We only want to compare exactly the same duration backwards
        const prevStart = subMonths(dateRange.start, monthsDiff);
        const prevEnd = subMonths(dateRange.end, monthsDiff);

        const currentTotals: Record<string, number> = {};
        const previousTotals: Record<string, number> = {};

        transactions.forEach(t => {
            const tDate = parseISO(t.date);
            const catId = t.category;

            if (isWithinInterval(tDate, { start: dateRange.start, end: dateRange.end })) {
                currentTotals[catId] = (currentTotals[catId] || 0) + t.amount;
            } else if (isWithinInterval(tDate, { start: prevStart, end: prevEnd })) {
                previousTotals[catId] = (previousTotals[catId] || 0) + t.amount;
            }
        });

        // We only care about categories that have *some* spending in either period
        const allRelevantCats = new Set([...Object.keys(currentTotals), ...Object.keys(previousTotals)]);

        const breakdown = Array.from(allRelevantCats)
            .map(catId => {
                const category = categories.find(c => c.id === catId);
                const currentAmount = currentTotals[catId] || 0;
                const prevAmount = previousTotals[catId] || 0;

                let diffPercent = 0;
                if (prevAmount > 0) {
                    diffPercent = ((currentAmount - prevAmount) / prevAmount) * 100;
                } else if (currentAmount > 0) {
                    diffPercent = 100; // infinite basically
                }

                return {
                    id: catId,
                    name: category?.name || 'Unknown',
                    color: category?.color || '#94A3B8',
                    currentAmount,
                    prevAmount,
                    diffPercent,
                    rawDiff: currentAmount - prevAmount
                };
            })
            // Sort by the absolute difference size to highlight the biggest changes
            .sort((a, b) => Math.abs(b.rawDiff) - Math.abs(a.rawDiff))
            .slice(0, 5); // Just show top 5 changes

        return breakdown;
    }, [transactions, categories, dateRange]);

    if (comparisonData.length === 0) return null;

    return (
        <div className="bg-white p-5 rounded-[16px] shadow-sm flex flex-col w-full font-dm-sans">
            <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                VS PREVIOUS {timePeriod.toUpperCase()}
            </h3>
            <p className="text-xs text-gray-400 mb-5">Comparing against previous period</p>

            <div className="space-y-4">
                {comparisonData.map((item, index) => {
                    const isUp = item.diffPercent > 0;
                    const isDown = item.diffPercent < 0;
                    const isFlat = item.diffPercent === 0;

                    // Cap the visual bar max width relative to others for safety
                    const maxAmount = Math.max(...comparisonData.map(d => Math.max(d.currentAmount, d.prevAmount)));

                    // Give it a floor so small bars don't disappear completely
                    const currentPct = Math.max((item.currentAmount / maxAmount) * 100, 2);
                    const prevPct = Math.max((item.prevAmount / maxAmount) * 100, 2);

                    return (
                        <div key={item.id} className="relative">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-700">{item.name}</span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold text-gray-900">${item.currentAmount.toFixed(0)}</span>

                                    {/* Trend Pill */}
                                    <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${isUp ? 'bg-red-50 text-red-600' : isDown ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {isUp && <TrendingUp className="w-3 h-3 stroke-[3]" />}
                                        {isDown && <TrendingDown className="w-3 h-3 stroke-[3]" />}
                                        {isFlat && <Minus className="w-3 h-3 stroke-[3]" />}
                                        <span className="text-[10px] font-bold tracking-tight">
                                            {Math.abs(item.diffPercent).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Double Bar Visual */}
                            <div className="space-y-1.5 mt-2">
                                {/* Previous Period */}
                                <div className="w-full bg-transparent flex items-center h-1.5 gap-2">
                                    <span className="w-14 text-[9px] font-bold text-gray-300 uppercase tracking-wider text-right flex-none leading-none">Previous</span>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${prevPct}%` }}
                                        transition={{ delay: index * 0.1, duration: 0.8 }}
                                        className="h-full bg-gray-200 rounded-r-sm transition-all"
                                    />
                                </div>

                                {/* Current Period */}
                                <div className="w-full bg-transparent flex items-center h-1.5 gap-2">
                                    <span className="w-14 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-right flex-none leading-none">This period</span>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${currentPct}%` }}
                                        transition={{ delay: index * 0.1, duration: 0.8 }}
                                        className="h-full rounded-r-sm transition-all"
                                        style={{ backgroundColor: item.color }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
