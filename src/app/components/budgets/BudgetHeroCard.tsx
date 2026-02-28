import { useMemo } from 'react';
import { format, getDaysInMonth, isPast, isSameMonth } from 'date-fns';

interface BudgetHeroCardProps {
    monthSpent: number;
    totalLimit: number;
    selectedMonthStart: Date;
}

export function BudgetHeroCard({ monthSpent, totalLimit, selectedMonthStart }: BudgetHeroCardProps) {
    const today = new Date();
    const isCurrent = isSameMonth(selectedMonthStart, today);
    const isPastMonth = isPast(selectedMonthStart) && !isCurrent;

    // Pace calculations
    const { daysElapsed, daysInMonth, projectedPace } = useMemo(() => {
        const totalDays = getDaysInMonth(selectedMonthStart);

        if (isCurrent) {
            // How many days have passed in the current month (minimum 1 to avoid div by 0 and weird 1st day stats)
            const elapsed = Math.max(1, today.getDate());
            const pace = (monthSpent / elapsed) * totalDays;
            return { daysElapsed: elapsed, daysInMonth: totalDays, projectedPace: pace };
        } else if (isPastMonth) {
            return { daysElapsed: totalDays, daysInMonth: totalDays, projectedPace: monthSpent };
        } else {
            // Future months (shouldn't really happen with the disabled Next button, but just in case)
            return { daysElapsed: 1, daysInMonth: totalDays, projectedPace: 0 };
        }
    }, [selectedMonthStart, monthSpent, isCurrent, isPastMonth]);

    const daysLeft = daysInMonth - daysElapsed;
    const remainingAmount = Math.max(0, totalLimit - monthSpent);
    const onTrack = isCurrent ? projectedPace <= totalLimit : monthSpent <= totalLimit;
    const avgPerDay = monthSpent / daysElapsed;

    // Progress calculation
    const progressPercent = totalLimit > 0 ? (monthSpent / totalLimit) * 100 : 0;
    const isOverBudget = monthSpent > totalLimit;
    const clampedProgress = Math.min(100, progressPercent);

    return (
        <div className="bg-blue-600 rounded-[28px] overflow-hidden shadow-lg p-6 relative flex flex-col items-center text-white font-dm-sans">
            {/* Background embellishments */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

            {/* Line 1: Month Label */}
            <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-white/70 mb-4 z-10 relative">
                {format(selectedMonthStart, 'MMMM yyyy')}
            </p>

            {/* Line 2: Large Amount Display */}
            <div className="flex items-baseline gap-2 z-10 relative mb-2">
                <span className="text-4xl font-extrabold tracking-tight">
                    ${Math.round(monthSpent).toLocaleString()}
                </span>
                <span className="text-xl font-medium text-blue-200">
                    / ${Math.round(totalLimit).toLocaleString()}
                </span>
            </div>

            {/* Line 3: Remaining / Time Context */}
            <div className="z-10 relative mb-8 flex flex-col items-center justify-center text-center">
                {daysLeft === 0 || isPastMonth ? (
                    <span className="bg-white/20 px-3 py-1.5 rounded-full text-[13px] font-semibold tracking-wide">
                        {isOverBudget
                            ? `Monthly limit exceeded by $${Math.round(monthSpent - totalLimit).toLocaleString()}`
                            : `Monthly goal achieved with $${Math.round(remainingAmount).toLocaleString()} left`
                        }
                    </span>
                ) : (
                    <span className="text-[15px] font-medium text-blue-100">
                        ${Math.round(remainingAmount).toLocaleString()} remaining &middot; {daysLeft} days left
                    </span>
                )}
            </div>

            {/* Line 4: Progress Bar */}
            <div className="w-full h-3 rounded-full bg-black/20 overflow-hidden z-10 relative mb-6">
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${isOverBudget ? 'bg-rose-400' : 'bg-white'}`}
                    style={{ width: `${clampedProgress}%` }}
                />
            </div>

            {/* Line 5: Three stats row */}
            <div className="w-full flex items-center justify-between text-[13px] font-medium text-blue-100 z-10 relative px-1">
                <div className="flex-1 text-left">
                    {Math.round(progressPercent)}% spent
                </div>
                <div className="flex-1 text-center font-mono">
                    Avg ${Math.round(avgPerDay)}/day
                </div>
                <div className="flex-1 text-right flex items-center justify-end gap-1">
                    {daysLeft === 0 || isPastMonth ? (
                        onTrack ? (
                            <>Goal achieved <span className="text-green-300">✓</span></>
                        ) : (
                            <>Limit exceeded <span className="text-rose-300">✗</span></>
                        )
                    ) : onTrack ? (
                        <>On track <span className="text-green-300">✓</span></>
                    ) : (
                        <>Over <span className="text-rose-300">✗</span></>
                    )}
                </div>
            </div>
        </div>
    );
}
