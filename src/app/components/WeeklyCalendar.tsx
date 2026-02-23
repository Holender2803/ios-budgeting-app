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

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getDayData = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayTransactions = transactions.filter(t => t.date === dateStr);
    const dayTotal = dayTransactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      dateStr,
      dayTotal,
      hasTransactions: dayTransactions.length > 0,
    };
  };

  return (
    <div className="px-6 py-4">
      <div className="space-y-1.5">
        {daysInWeek.map((day, index) => {
          const dayData = getDayData(day);
          const isTodayDate = isToday(day);

          return (
            <motion.button
              key={day.toString()}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => onDayClick(dayData.dateStr)}
              className={`w-full bg-white rounded-xl px-4 py-3.5 hover:shadow-sm transition-all text-left ${isTodayDate ? 'ring-1 ring-gray-300' : ''
                }`}
            >
              <div className="flex items-center justify-between">
                {/* Left: Day · Date */}
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isTodayDate ? 'text-gray-900' : 'text-gray-600'}`}>
                    {format(day, 'EEE')} · {format(day, 'd')}
                  </span>
                </div>

                {/* Right: Total (emphasized) */}
                <div>
                  {dayData.hasTransactions ? (
                    <div className="text-xl font-semibold text-gray-900">
                      ${dayData.dayTotal.toFixed(0)}
                    </div>
                  ) : (
                    <div className="text-base text-gray-400">
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
