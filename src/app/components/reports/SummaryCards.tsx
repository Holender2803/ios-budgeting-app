import { useMemo } from 'react';
import { Transaction } from '../../types';
import { differenceInDays, parseISO, format } from 'date-fns';

interface SummaryCardsProps {
    transactions: Transaction[];
    dateRange: { start: Date; end: Date };
}

export function SummaryCards({ transactions, dateRange }: SummaryCardsProps) {
    const stats = useMemo(() => {
        let totalSpent = 0;
        const dailyTotals: Record<string, number> = {};

        transactions.forEach(t => {
            totalSpent += t.amount;
            const dateKey = t.date;
            dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + t.amount;
        });

        // Calculate days in period for average
        // Add 1 because differenceInDays is exclusive of the end date if it's the exact same time
        const days = Math.max(1, differenceInDays(dateRange.end, dateRange.start) + 1);
        const dailyAvg = totalSpent / days;

        // Find biggest day
        let biggestDayAmount = 0;
        let biggestDayDate = '';

        Object.entries(dailyTotals).forEach(([date, amount]) => {
            if (amount > biggestDayAmount) {
                biggestDayAmount = amount;
                biggestDayDate = date;
            }
        });

        return {
            totalSpent,
            dailyAvg,
            biggestDay: {
                date: biggestDayDate,
                amount: biggestDayAmount
            }
        };
    }, [transactions, dateRange]);

    return (
        <div className="grid grid-cols-3 gap-2 w-full mt-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Spent</span>
                <span className="text-lg font-bold text-gray-900">${stats.totalSpent.toFixed(0)}</span>
            </div>

            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Daily Avg</span>
                <span className="text-lg font-bold text-gray-900">${stats.dailyAvg.toFixed(0)}</span>
            </div>

            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Biggest Day</span>
                <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-[15px] font-bold text-gray-900 leading-none">
                        {stats.biggestDay.amount > 0 ? `$${stats.biggestDay.amount.toFixed(0)}` : '-'}
                    </span>
                    <span className="text-[11px] font-medium text-gray-500 truncate leading-none pt-0.5">
                        {stats.biggestDay.date ? format(parseISO(stats.biggestDay.date), 'MMM d (EEE)') : ''}
                    </span>
                </div>
            </div>
        </div>
    );
}
