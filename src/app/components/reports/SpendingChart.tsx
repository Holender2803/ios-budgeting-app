import { useMemo, useState, useRef, useEffect } from 'react';
import { Transaction } from '../../types';
import { TimePeriod } from './PeriodSelector';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, YAxis, ReferenceLine } from 'recharts';
import { format, parseISO, eachDayOfInterval, eachWeekOfInterval, isSameDay, isSameWeek, differenceInDays } from 'date-fns';

interface SpendingChartProps {
    transactions: Transaction[];
    dateRange: { start: Date; end: Date };
    timePeriod: TimePeriod;
}

export function SpendingChart({ transactions, dateRange, timePeriod }: SpendingChartProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Determine the granularity of the chart based on the period
    const granularity = useMemo(() => {
        if (timePeriod === 'Week' || timePeriod === 'Month') return 'daily';
        if (timePeriod === '3 Months') return 'weekly';

        // Custom logic
        const daysDiff = differenceInDays(dateRange.end, dateRange.start);
        return daysDiff <= 14 ? 'daily' : 'weekly';
    }, [timePeriod, dateRange]);

    const { chartData, average } = useMemo(() => {
        let buckets: { label: string; fullDate: string; date: Date; amount: number; isCurrentPeriod: boolean }[] = [];
        const today = new Date();
        let totalAmount = 0;

        if (granularity === 'daily') {
            const days = eachDayOfInterval(dateRange);
            buckets = days.map(day => ({
                label: format(day, timePeriod === 'Week' ? 'EEE' : 'MMM d'), // "Mon" or "Feb 1"
                fullDate: format(day, 'MMM d, yyyy'),
                date: day,
                amount: 0,
                isCurrentPeriod: isSameDay(day, today)
            }));

            transactions.forEach(t => {
                const tDate = parseISO(t.date);
                const bucket = buckets.find(b => isSameDay(b.date, tDate));
                if (bucket) {
                    bucket.amount += t.amount;
                    totalAmount += t.amount;
                }
            });
        } else {
            const weeks = eachWeekOfInterval(dateRange);
            buckets = weeks.map(week => ({
                label: format(week, 'MMM d'), // Week start date
                fullDate: `Week of ${format(week, 'MMM d, yyyy')}`,
                date: week,
                amount: 0,
                isCurrentPeriod: isSameWeek(week, today)
            }));

            transactions.forEach(t => {
                const tDate = parseISO(t.date);
                const bucket = buckets.find(b => isSameWeek(b.date, tDate));
                if (bucket) {
                    bucket.amount += t.amount;
                    totalAmount += t.amount;
                }
            });
        }

        // Apply a floor of 0.1 so zero-spend days have a 1px baseline tick
        buckets = buckets.map(b => ({
            ...b,
            amount: Math.max(b.amount, 0.1)
        }));

        const avg = buckets.length > 0 ? totalAmount / buckets.length : 0;

        return { chartData: buckets, average: avg };
    }, [transactions, dateRange, granularity, timePeriod]);


    // Scroll to the end on mount or when data changes so we always see the most recent data block
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
    }, [chartData]);


    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            // Only show values, subtracting the 0.1 fake floor if it is just a baseline tick
            const displayAmount = data.amount <= 0.1 ? 0 : data.amount;

            return (
                <div className="bg-gray-900 text-white px-3 py-2 rounded-[10px] shadow-lg text-sm font-semibold font-dm-sans z-50">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                        {data.fullDate}
                    </div>
                    ${displayAmount.toFixed(0)} spent
                </div>
            );
        }
        return null;
    };

    // Calculate dynamic minimum width
    // Week fits perfectly, Month scrolls. 40px per bar gives solid spacing.
    // If it's a 30 day month, 30 * 40 = 1200px wide.
    const minWidth = timePeriod === 'Week' ? '100%' : `${chartData.length * 40}px`;

    return (
        <div className="bg-white p-5 rounded-[16px] shadow-sm flex flex-col w-full h-[320px] relative">
            <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                Spending Over Time
            </h3>

            {/* Scrollable Chart Container */}
            <div className="flex-1 w-full min-h-0 relative -ml-2 group">
                {/* Visual fade on the left to indicate scrollability when not scrolled to the very left */}
                {(timePeriod === 'Month' || chartData.length > 7) && (
                    <div className="absolute left-6 top-0 bottom-8 w-12 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                )}

                <div
                    ref={scrollRef}
                    className="w-full h-full overflow-x-auto overflow-y-hidden scrollbar-none snap-x snap-mandatory"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                    <div style={{ minWidth, height: '100%' }} className="pr-4 pl-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                                onClick={(state) => {
                                    if (state && state.activeTooltipIndex !== undefined) {
                                        setActiveIndex(state.activeTooltipIndex);
                                    } else {
                                        setActiveIndex(null);
                                    }
                                }}
                            >
                                <XAxis
                                    dataKey="label"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600, fontFamily: 'DM Sans' }}
                                    dy={10}
                                    // For months, skip labels so it's not crowded
                                    interval={granularity === 'daily' && chartData.length > 14 ? 3 : 'preserveStartEnd'}
                                    minTickGap={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#CBD5E1', fontWeight: 600, fontFamily: 'DM Sans' }}
                                    tickFormatter={(value) => `$${value}`}
                                    tickCount={4}
                                    width={40}
                                />
                                <Tooltip
                                    cursor={{ fill: '#F3F4F6', opacity: 0.5, radius: 4 }}
                                    content={<CustomTooltip />}
                                    position={{ y: 0 }}
                                />
                                {average > 0 && (
                                    <ReferenceLine
                                        y={average}
                                        stroke="#9CA3AF"
                                        strokeDasharray="4 4"
                                        opacity={0.5}
                                    />
                                )}
                                <Bar
                                    dataKey="amount"
                                    radius={[4, 4, 4, 4]}
                                    maxBarSize={40}
                                    animationDuration={500}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={
                                                activeIndex === index
                                                    ? '#1E40AF' // Active highlighted
                                                    : entry.isCurrentPeriod
                                                        ? '#3B82F6' // Current day/week is solid blue
                                                        : '#DBEAFE' // Light blue for everything else
                                            }
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
