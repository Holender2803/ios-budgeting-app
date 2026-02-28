import { useState, useMemo } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { BottomNav } from '../components/BottomNav';
import { PeriodSelector, TimePeriod } from '../components/reports/PeriodSelector';
import { WeekSelector } from '../components/reports/WeekSelector';
import { SummaryCards } from '../components/reports/SummaryCards';
import { SpendingChart } from '../components/reports/SpendingChart';
import { CategoryBreakdown } from '../components/reports/CategoryBreakdown';
import { RecurringVsVariable } from '../components/reports/RecurringVsVariable';
import { TopVendors } from '../components/reports/TopVendors';
import { ComparisonChart } from '../components/reports/ComparisonChart';
import { CustomDateSheet } from '../components/reports/CustomDateSheet';
import { MonthNavigator } from '../components/reports/MonthNavigator';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO, format } from 'date-fns';
import * as Switch from '@radix-ui/react-switch';

export function Reports() {
    const { filteredTransactions, categories, includeRecurring, setIncludeRecurring } = useExpense();
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('Month');
    const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(startOfWeek(new Date()));
    const [selectedMonthStart, setSelectedMonthStart] = useState<Date>(startOfMonth(new Date()));

    // Custom Date Range State
    const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | null>(null);
    const [isCustomSheetOpen, setIsCustomSheetOpen] = useState(false);

    // 1. Determine Date Range based on Period Selectors
    const dateRange = useMemo(() => {
        const today = new Date();

        switch (timePeriod) {
            case 'Week':
                return { start: selectedWeekStart, end: endOfWeek(selectedWeekStart) };
            case 'Month':
                return { start: selectedMonthStart, end: endOfMonth(selectedMonthStart) };
            case '3 Months':
                return { start: startOfMonth(subMonths(selectedMonthStart, 2)), end: endOfMonth(selectedMonthStart) };
            case 'Custom':
                if (customRange) return customRange;
                return { start: startOfMonth(today), end: endOfMonth(today) };
        }
    }, [timePeriod, selectedWeekStart, selectedMonthStart, customRange]);

    // 2. Filter Transactions to the exact Date Range and handle Recurring
    const { periodTransactions, hiddenRecurringAmount } = useMemo(() => {
        let hiddenRec = 0;

        const filtered = filteredTransactions.filter(t => {
            const tDate = parseISO(t.date);
            const inRange = isWithinInterval(tDate, { start: dateRange.start, end: dateRange.end });

            if (inRange) {
                if (!includeRecurring && t.isRecurring) {
                    hiddenRec += t.amount;
                    return false;
                }
                return true;
            }
            return false;
        });

        return { periodTransactions: filtered, hiddenRecurringAmount: hiddenRec };
    }, [filteredTransactions, dateRange, includeRecurring]);

    const handlePeriodChange = (period: TimePeriod) => {
        if (period === 'Custom') {
            setIsCustomSheetOpen(true);
        }
        setTimePeriod(period);
    };

    return (
        <div className="h-[100dvh] flex flex-col bg-[#F1F5F9] overflow-hidden relative font-dm-sans">
            {/* Frozen Header */}
            <div className="flex-none bg-white border-b border-gray-100 z-30 shadow-sm relative pt-12 pb-4 px-6 rounded-b-[24px]">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>

                <PeriodSelector value={timePeriod} onChange={handlePeriodChange} />

                {timePeriod === 'Custom' && customRange && (
                    <div className="mt-3 text-center">
                        <span className="inline-block bg-blue-50 text-blue-600 text-[13px] font-bold px-3 py-1 rounded-full font-dm-sans">
                            {format(customRange.start, 'MMM d')} – {format(customRange.end, 'MMM d, yyyy')}
                        </span>
                    </div>
                )}

                {/* Include Recurring Toggle */}
                <div className="mt-6 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-gray-900">Include recurring</span>
                        {!includeRecurring && hiddenRecurringAmount > 0 && (
                            <span className="text-xs text-gray-500 mt-0.5">
                                Recurring excluded · ${hiddenRecurringAmount.toFixed(0)} hidden
                            </span>
                        )}
                    </div>

                    <Switch.Root
                        checked={includeRecurring}
                        onCheckedChange={setIncludeRecurring}
                        className={`w-11 h-6 rounded-full relative shadow-inner outline-none transition-colors ${includeRecurring ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                    >
                        <Switch.Thumb
                            className={`block w-5 h-5 bg-white rounded-full shadow-md transition-transform transform ${includeRecurring ? 'translate-x-[22px]' : 'translate-x-0.5'
                                } mt-0.5`}
                        />
                    </Switch.Root>
                </div>

                {(timePeriod === 'Month' || timePeriod === '3 Months') && (
                    <MonthNavigator
                        currentMonth={selectedMonthStart}
                        onChange={setSelectedMonthStart}
                    />
                )}

                {timePeriod === 'Week' && (
                    <WeekSelector
                        selectedWeekStart={selectedWeekStart}
                        onChange={setSelectedWeekStart}
                    />
                )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 pt-6 pb-32 space-y-4">

                <SummaryCards
                    transactions={periodTransactions}
                    dateRange={dateRange}
                />

                <SpendingChart
                    transactions={periodTransactions}
                    dateRange={dateRange}
                    timePeriod={timePeriod}
                />

                <CategoryBreakdown
                    transactions={periodTransactions}
                    categories={categories}
                />

                <RecurringVsVariable
                    transactions={periodTransactions}
                />

                <TopVendors
                    transactions={periodTransactions}
                    categories={categories}
                />

                <ComparisonChart
                    transactions={filteredTransactions} // Pass ALL active transactions so it can compute 'previous' period
                    categories={categories}
                    dateRange={dateRange}
                    timePeriod={timePeriod}
                />

                {periodTransactions.length === 0 && (
                    <div className="bg-white p-6 rounded-[16px] shadow-sm flex flex-col items-center justify-center min-h-[160px] text-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                            <span className="text-xl">📭</span>
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 mb-1">No expenses found</h3>
                        <p className="text-xs text-gray-400 max-w-[200px]">
                            We couldn't find any transactions for the selected period.
                        </p>
                    </div>
                )}
            </div>
            {/* Frozen Footer */}
            <div className="flex-none bg-white border-t border-gray-100 z-20">
                <BottomNav />
            </div>

            <CustomDateSheet
                isOpen={isCustomSheetOpen}
                onClose={() => setIsCustomSheetOpen(false)}
                onApply={(start, end) => {
                    setCustomRange({ start, end });
                }}
                initialStart={customRange?.start}
                initialEnd={customRange?.end}
            />
        </div>
    );
}
