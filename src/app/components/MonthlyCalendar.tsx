import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { useExpense } from '../context/ExpenseContext';
import { Transaction } from '../types';
import { motion } from 'motion/react';

interface MonthlyCalendarProps {
  currentDate: Date;
  onDayClick: (date: string) => void;
  transactions: Transaction[];
}

export function MonthlyCalendar({ currentDate, onDayClick, transactions }: MonthlyCalendarProps) {

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weeks = eachWeekOfInterval({ start: calendarStart, end: calendarEnd });

  const getDayData = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTransactions = transactions.filter(t => t.date === dateStr);
    const total = dayTransactions.reduce((sum, t) => sum + t.amount, 0);

    return { total, count: dayTransactions.length };
  };

  const getWeekTotal = (weekStart: Date) => {
    const weekEnd = endOfWeek(weekStart);
    const weekTransactions = transactions.filter(t => {
      const tDate = new Date(t.date + 'T00:00:00');
      return tDate >= weekStart && tDate <= weekEnd;
    });

    return weekTransactions.reduce((sum, t) => sum + t.amount, 0);
  };

  const getIntensityStyles = (amount: number) => {
    if (amount === 0) return {
      tile: 'bg-white',
      text: 'text-gray-400',
      label: 'hidden'
    };
    if (amount < 20) return {
      tile: 'bg-[var(--intensity-1-bg)]',
      text: 'text-[var(--intensity-1-text)]',
      label: 'text-[var(--intensity-1-text)]/75'
    };
    if (amount < 60) return {
      tile: 'bg-[var(--intensity-2-bg)]',
      text: 'text-[var(--intensity-2-text)]',
      label: 'text-[var(--intensity-2-text)]/75'
    };
    if (amount < 120) return {
      tile: 'bg-[var(--intensity-3-bg)]',
      text: 'text-[var(--intensity-3-text)]',
      label: 'text-[var(--intensity-3-text)]/75'
    };
    return {
      tile: 'bg-[var(--intensity-4-bg)] shadow-[var(--intensity-4-shadow)]',
      text: 'text-[var(--intensity-4-text)] font-medium',
      label: 'text-[var(--intensity-4-text)]/75'
    };
  };

  return (
    <div className="px-4 py-6 select-none">
      {/* Day headers */}
      <div className="flex items-center mb-5">
        <div className="grid grid-cols-7 gap-1.5 flex-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
            <div key={day} className="text-center text-[10px] text-gray-400 font-medium uppercase tracking-widest py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="w-12 ml-2"></div>
      </div>

      {/* Calendar weeks */}
      {weeks.map((weekStart, weekIndex) => {
        const weekEnd = endOfWeek(weekStart);
        const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
        const weekTotal = getWeekTotal(weekStart);

        return (
          <div key={weekIndex} className="flex items-center mb-1.5">
            {/* Days in this week */}
            <div className="grid grid-cols-7 gap-1.5 flex-1">
              {weekDays.map((day) => {
                const dayData = getDayData(day);
                const dateStr = format(day, 'yyyy-MM-dd');
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDate = isToday(day);
                const styles = getIntensityStyles(dayData.total);

                return (
                  <motion.button
                    key={day.toString()}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => onDayClick(dateStr)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all duration-200 ${styles.tile
                      } ${!isCurrentMonth ? 'opacity-20' : ''} ${isTodayDate && dayData.total === 0 ? 'ring-2 ring-blue-500/30 ring-offset-1' : ''
                      } ${dayData.total > 0 ? 'hover:shadow-md' : ''}`}
                  >
                    <span className={`text-[13px] leading-none mb-0.5 ${styles.text} ${isTodayDate && dayData.total === 0 ? 'text-blue-600 font-semibold' : ''}`}>
                      {format(day, 'd')}
                    </span>

                    {dayData.total > 0 && (
                      <span className={`text-[8px] font-mono leading-none ${styles.label}`}>
                        ${dayData.total.toFixed(0)}
                      </span>
                    )}

                    {/* Today indicator when there is spend */}
                    {isTodayDate && dayData.total > 0 && (
                      <div className="absolute bottom-1 w-1 h-1 bg-white rounded-full opacity-80" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Weekly total */}
            <div className="w-12 ml-2 flex justify-end items-center">
              {weekTotal > 0 && (
                <span className="text-[10px] font-mono font-medium text-gray-400 opacity-80 tabular-nums">
                  ${weekTotal.toFixed(0)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
