import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { useExpense } from '../context/ExpenseContext';
import { Transaction } from '../types';
import { motion } from 'motion/react';

interface WeeklyCalendarProps {
  currentDate: Date;
  onDayClick: (date: string) => void;
  transactions: Transaction[];
}

export function WeeklyCalendar({ currentDate, onDayClick, transactions }: WeeklyCalendarProps) {
  const { getCategoryById } = useExpense();

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getDayData = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayTransactions = transactions.filter(t => t.date === dateStr);
    const dayTotal = dayTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Get unique category names for this day
    const dayCategories = Array.from(new Set(dayTransactions.map(t => {
      const cat = getCategoryById(t.category);
      return cat?.name;
    }).filter(Boolean))).join(', ');

    return {
      dateStr,
      dayTotal,
      hasTransactions: dayTransactions.length > 0,
      categories: dayCategories
    };
  };

  const dayDataList = daysInWeek.map(d => getDayData(d));
  const maxSpend = Math.max(...dayDataList.map(d => d.dayTotal));
  const minSpend = Math.min(...dayDataList.filter(d => d.dayTotal > 0).map(d => d.dayTotal));

  const getIntensityLevel = (amount: number) => {
    if (amount === 0) return 0;
    if (maxSpend === minSpend) return 4; // If all spend is the same, treat as highest

    const range = maxSpend - minSpend;
    const percentile = (amount - minSpend) / range;

    if (percentile <= 0.25) return 1;
    if (percentile <= 0.50) return 2;
    if (percentile <= 0.75) return 3;
    return 4;
  };

  const getIntensityStyles = (level: number) => {
    switch (level) {
      case 1: return {
        bar: 'w-[4px] bg-[#8FA3FF]',
        tint: 'bg-[#EEF1FF]',
        text: 'text-[#5C7CFF]',
        amount: 'text-[14px] text-[#5C7CFF]',
        spark: 'w-[25%] bg-[#8FA3FF]'
      };
      case 2: return {
        bar: 'w-[5px] bg-[#5C7CFF]',
        tint: 'bg-[#DDE3FF]',
        text: 'text-[#3D5AFE] font-semibold',
        amount: 'text-[15px] text-[#3D5AFE]',
        spark: 'w-[50%] bg-[#5C7CFF]'
      };
      case 3: return {
        bar: 'w-[6px] bg-[#3D5AFE]',
        tint: 'bg-[#C7D0FF]',
        text: 'text-[#1a2a80] font-semibold',
        amount: 'text-[16px] text-[#1a2a80]',
        spark: 'w-[75%] bg-[#3D5AFE]'
      };
      case 4: return {
        bar: 'w-[7px] bg-[#1a2a80]',
        tint: 'bg-[#B3BFFF]',
        text: 'text-[#1a2a80] font-bold',
        amount: 'text-[17px] text-[#1a2a80] font-bold',
        spark: 'w-[95%] bg-[#1a2a80]'
      };
      default: return {
        bar: 'w-[3px] bg-gray-200',
        tint: 'bg-white',
        text: 'text-gray-600',
        amount: 'text-[14px] text-gray-400',
        spark: 'w-0'
      };
    }
  };

  return (
    <div className="px-6 py-4 select-none">
      <div className="space-y-2">
        {daysInWeek.map((day, index) => {
          const data = dayDataList[index];
          const isTodayDate = isToday(day);
          const level = getIntensityLevel(data.dayTotal);
          const styles = getIntensityStyles(level);

          return (
            <motion.button
              key={day.toString()}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => onDayClick(data.dateStr)}
              className={`w-full relative overflow-hidden rounded-xl transition-all text-left group ${styles.tint} ${isTodayDate ? 'ring-[1.5px] ring-black ring-offset-1' : ''
                } ${data.dayTotal > 0 ? 'py-4 hover:shadow-md' : 'py-3 opacity-80 hover:bg-gray-50'}`}
            >
              {/* Intensity Bar */}
              <div className={`absolute left-0 top-0 bottom-0 transition-all ${styles.bar}`} />

              <div className="flex items-center justify-between px-4">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[13px] ${styles.text}`}>
                      {format(day, 'EEEE')} · {format(day, 'd')}
                    </span>
                    {isTodayDate && (
                      <span className="px-1.5 py-0.5 bg-black text-[9px] font-bold text-white rounded uppercase tracking-wider">
                        Today
                      </span>
                    )}
                  </div>

                  {data.dayTotal > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-gray-500 truncate leading-none">
                        {data.categories}
                      </p>
                      <div className="w-full h-[3px] bg-black/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${styles.spark}`} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {data.hasTransactions ? (
                    <div className={`font-mono tabular-nums ${styles.amount}`}>
                      ${data.dayTotal.toFixed(0)}
                    </div>
                  ) : (
                    <div className="text-[14px] font-medium text-gray-300">
                      —
                    </div>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
