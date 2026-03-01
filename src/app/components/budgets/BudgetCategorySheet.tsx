import { useMemo } from 'react';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { format, isSameMonth, subMonths, isWithinInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useRef, useEffect } from 'react';
import { Category, Transaction } from '../../types';

interface BudgetCategorySheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: Category | null;
    selectedMonthStart: Date;
    transactions: Transaction[];
    monthSpent: number;
    monthLimit: number;
}

export function BudgetCategorySheet({
    open,
    onOpenChange,
    category,
    selectedMonthStart,
    transactions,
    monthSpent,
    monthLimit
}: BudgetCategorySheetProps) {
    const isCurrentMonth = isSameMonth(selectedMonthStart, new Date());
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to the far right when opened
    // Use an interval to aggressively pin the scroll to the right during the entire 
    // Vaul Drawer slide-up animation (which alters container width dynamically).
    useEffect(() => {
        if (open && scrollContainerRef.current) {
            const scroller = scrollContainerRef.current;

            const snapRight = () => {
                if (scroller) {
                    scroller.scrollLeft = scroller.scrollWidth;
                }
            };

            // Force scroll right continuously for 600ms (covers the Drawer animation)
            const intervalId = setInterval(snapRight, 16); // roughly every frame
            const timeoutId = setTimeout(() => {
                clearInterval(intervalId);
            }, 600);

            return () => {
                clearInterval(intervalId);
                clearTimeout(timeoutId);
            };
        }
    }, [open, selectedMonthStart]);

    // Process transactions and history
    const {
        categoryTransactions,
        dailyTotals,
        maxDaily,
        previousMonthSpent
    } = useMemo(() => {
        if (!category) return { categoryTransactions: [], dailyTotals: [], maxDaily: 0, previousMonthSpent: 0 };

        const monthEnd = endOfMonth(selectedMonthStart);
        const prevMonthStart = startOfMonth(subMonths(selectedMonthStart, 1));
        const prevMonthEnd = endOfMonth(prevMonthStart);

        const currentTxs: Transaction[] = [];
        const daysMap = new Map<number, number>();
        let prevSpent = 0;

        transactions.forEach(t => {
            if (t.category !== category.id || t.isRecurring) return;

            const tDate = parseISO(t.date);

            // Current month processing
            if (isWithinInterval(tDate, { start: selectedMonthStart, end: monthEnd })) {
                currentTxs.push(t);
                const day = tDate.getDate();
                daysMap.set(day, (daysMap.get(day) || 0) + t.amount);
            }

            // Previous month processing
            if (isWithinInterval(tDate, { start: prevMonthStart, end: prevMonthEnd })) {
                prevSpent += t.amount;
            }
        });

        // Generate array for all days in month up to the current day (if current month) OR the end of the month
        const endDay = isSameMonth(selectedMonthStart, new Date())
            ? Math.max(1, new Date().getDate())
            : monthEnd.getDate();

        const dailyArr = [];
        let max = 0;
        for (let i = 1; i <= endDay; i++) {
            const val = daysMap.get(i) || 0;
            if (val > max) max = val;
            dailyArr.push({ day: i, amount: val });
        }

        // Sort latest first
        currentTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            categoryTransactions: currentTxs,
            dailyTotals: dailyArr,
            maxDaily: max,
            previousMonthSpent: prevSpent
        };
    }, [category, transactions, selectedMonthStart]);

    if (!category) return null;

    const IconComponent = (LucideIcons as any)[category.icon];
    const diffFromPrev = monthSpent - previousMonthSpent;
    const progressPercent = monthLimit > 0 ? (monthSpent / monthLimit) * 100 : 0;
    const clampedProgress = Math.min(100, progressPercent);

    let barColorClass = "bg-[#10B981]";
    if (monthSpent > monthLimit || progressPercent > 90) {
        barColorClass = "bg-[#EF4444]";
    } else if (progressPercent >= 70) {
        barColorClass = "bg-[#F59E0B]";
    }

    return (
        <Drawer.Root open={open} onOpenChange={onOpenChange}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" />
                <Drawer.Content className="app-drawer-frame">
                    <div className="app-drawer-panel flex flex-col font-dm-sans max-h-[85vh] rounded-t-[24px] md:rounded-[24px]">

                        {/* Header */}
                        <div className="flex-none p-6 pb-4 border-b border-gray-100 flex items-start justify-between bg-white/80 backdrop-blur-md sticky top-0 rounded-t-[24px] z-10">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-12 h-12 rounded-[14px] flex items-center justify-center shadow-sm"
                                    style={{ backgroundColor: `${category.color}20` }}
                                >
                                    {IconComponent && <IconComponent className="w-6 h-6" style={{ color: category.color }} />}
                                </div>
                                <div>
                                    <h2 className="text-[20px] font-bold text-gray-900 leading-tight tracking-tight">
                                        {category.name}
                                    </h2>
                                    <p className="text-[13px] text-gray-500 font-medium">
                                        {isCurrentMonth ? 'This month' : format(selectedMonthStart, 'MMMM yyyy')}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => onOpenChange(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scroll Content */}
                        <div className="flex-1 overflow-y-auto w-full">
                            <div className="px-6 py-5 space-y-8">

                                {/* Top Stats */}
                                <div className="space-y-4 pt-1">
                                    <div className="flex items-end gap-2.5">
                                        <span className="text-4xl font-extrabold text-gray-900 tracking-tight leading-none">
                                            ${Math.round(monthSpent).toLocaleString()}
                                        </span>
                                        <span className="text-lg font-medium text-gray-400 mb-1 leading-none">
                                            / ${Math.round(monthLimit).toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${barColorClass}`}
                                            style={{ width: `${clampedProgress}%` }}
                                        />
                                    </div>

                                    {/* Month over Month Comparison */}
                                    <div className="flex items-center gap-2 mt-2">
                                        {diffFromPrev < 0 ? (
                                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[12px] font-bold px-2 py-0.5 rounded-md">
                                                ↓ ${Math.round(Math.abs(diffFromPrev)).toLocaleString()}
                                            </span>
                                        ) : diffFromPrev > 0 ? (
                                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-[12px] font-bold px-2 py-0.5 rounded-md">
                                                ↑ ${Math.round(diffFromPrev).toLocaleString()}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 text-[12px] font-bold px-2 py-0.5 rounded-md">
                                                No change
                                            </span>
                                        )}
                                        <span className="text-[12px] text-gray-400 font-medium">vs previous month</span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-4">
                                        Daily Spending
                                    </h3>
                                    <div
                                        ref={scrollContainerRef}
                                        className="w-full overflow-x-auto pb-2 scrollbar-hide"
                                    >
                                        <div className="flex items-end gap-[4px] h-[140px] px-1 min-w-max">
                                            {dailyTotals.map((day) => {
                                                const heightPct = maxDaily > 0 ? (day.amount / maxDaily) * 90 : 0;
                                                const isToday = day.day === new Date().getDate() && isCurrentMonth;

                                                return (
                                                    <div key={day.day} className="flex flex-col items-center justify-end h-full w-[14px] shrink-0 group relative">
                                                        {/* Tooltip on hover */}
                                                        {day.amount > 0 && (
                                                            <div className="absolute bottom-full mb-1 flex justify-center w-full opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                                <div className="bg-gray-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap font-mono">
                                                                    ${Math.round(day.amount)}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="w-full flex-1 flex items-end justify-center cursor-crosshair">
                                                            {day.amount === 0 ? (
                                                                <div className="w-full h-[2px] bg-gray-200 mb-0.5 relative z-0" />
                                                            ) : (
                                                                <div
                                                                    className="w-full bg-blue-500 rounded-t-[4px] transition-all duration-500 relative z-10"
                                                                    style={{ height: `${heightPct}%` }}
                                                                />
                                                            )}
                                                        </div>

                                                        {/* X-Axis Label Zone */}
                                                        <div className="mt-1 h-[28px] flex flex-col items-center justify-start">
                                                            <span className="text-[10px] whitespace-nowrap font-medium text-gray-400">
                                                                {day.day}
                                                            </span>
                                                            {isToday && (
                                                                <div className="flex flex-col items-center">
                                                                    <div className="w-[1px] h-[6px] bg-blue-400 my-[2px]"></div>
                                                                    <span className="text-[9px] font-bold text-blue-500 leading-none">Today</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Transaction List */}
                                <div>
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3">
                                        Transactions
                                    </h3>

                                    {categoryTransactions.length > 0 ? (
                                        <div className="space-y-4">
                                            {categoryTransactions.map(tx => (
                                                <div key={tx.id} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                                            <span className="text-gray-500 font-medium text-[13px]">
                                                                {format(parseISO(tx.date), 'dd')}
                                                            </span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[14px] font-bold text-gray-900 truncate">
                                                                {tx.vendor}
                                                            </p>
                                                            <p className="text-[12px] text-gray-500">
                                                                {format(parseISO(tx.date), 'MMM d, yyyy')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 pl-3">
                                                        <p className="text-[15px] font-bold text-gray-900 font-mono">
                                                            ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 bg-gray-50 rounded-[16px]">
                                            <p className="text-[13px] font-semibold text-gray-500">No transactions</p>
                                            <p className="text-[12px] text-gray-400 mt-1">No spending in this category yet.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="h-4" /> {/* Bottom padding */}
                            </div>
                        </div>

                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
