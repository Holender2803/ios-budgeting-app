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

  const getIntensityColor = (amount: number) => {
    if (amount === 0) return 'bg-white';
    if (amount < 20) return 'bg-gray-50';
    if (amount < 50) return 'bg-gray-100';
    if (amount < 100) return 'bg-gray-200';
    if (amount < 200) return 'bg-gray-300';
    return 'bg-gray-400';
  };

  return (
    <div className="px-4 py-6">
      {/* Day headers */}
      <div className="flex items-center mb-4">
        <div className="grid grid-cols-7 gap-1.5 flex-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs text-gray-400 font-normal py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="w-12 ml-2"></div> {/* Spacer for alignment */}
      </div>

      {/* Calendar weeks */}
      {weeks.map((weekStart, weekIndex) => {
        const weekEnd = endOfWeek(weekStart);
        const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
        const weekTotal = getWeekTotal(weekStart);

        return (
          <div key={weekIndex} className="flex items-center mb-2">
            {/* Days in this week */}
            <div className="grid grid-cols-7 gap-1.5 flex-1">
              {weekDays.map((day) => {
                const dayData = getDayData(day);
                const dateStr = format(day, 'yyyy-MM-dd');
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDate = isToday(day);

                return (
                  <motion.button
                    key={day.toString()}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onDayClick(dateStr)}
                    className={`aspect-square rounded-lg flex items-center justify-center transition-all ${getIntensityColor(dayData.total)
                      } ${!isCurrentMonth ? 'opacity-30' : ''} ${isTodayDate ? 'ring-1 ring-gray-400' : ''
                      } ${dayData.count > 0 ? 'hover:shadow-sm' : ''}`}
                  >
                    <span className={`text-sm ${dayData.total > 100 ? 'text-white font-medium' : 'text-gray-700'}`}>
                      {format(day, 'd')}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Weekly total - subtly on the right */}
            <div className="w-12 ml-2 flex justify-end items-center">
              {weekTotal > 0 && (
                <span className="text-[10px] text-gray-400 opacity-70 whitespace-nowrap">
                  wk ${weekTotal.toFixed(0)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
