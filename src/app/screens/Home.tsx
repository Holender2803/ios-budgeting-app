import { useState } from 'react';
import { useNavigate } from 'react-router';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isToday } from 'date-fns';
import { MonthlyCalendar } from '../components/MonthlyCalendar';
import { WeeklyCalendar } from '../components/WeeklyCalendar';
import { DailyView } from '../components/DailyView';
import { CategoryFilterBar } from '../components/CategoryFilterBar';
import { BottomNav } from '../components/BottomNav';
import { useExpense } from '../context/ExpenseContext';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { downloadICS } from '../utils/icsExport';

type TimeView = 'daily' | 'weekly' | 'monthly';

export function Home() {
  const navigate = useNavigate();
  const { transactions, categories, selectedCategoryIds, recurringExceptions } = useExpense();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeView, setTimeView] = useState<TimeView>('monthly');
  const [includeRecurring, setIncludeRecurring] = useState(false);

  // Navigation handlers
  const handlePrev = () => {
    if (timeView === 'daily') {
      setCurrentDate(prev => subDays(prev, 1));
    } else if (timeView === 'weekly') {
      setCurrentDate(prev => subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => subMonths(prev, 1));
    }
  };

  const handleNext = () => {
    if (timeView === 'daily') {
      setCurrentDate(prev => addDays(prev, 1));
    } else if (timeView === 'weekly') {
      setCurrentDate(prev => addWeeks(prev, 1));
    } else {
      setCurrentDate(prev => addMonths(prev, 1));
    }
  };

  const handleDayClick = (date: string) => {
    navigate(`/day/${date}`);
  };

  // Calculate totals based on current view
  const getCurrentFilteredTransactions = () => {
    let filteredTransactions = transactions;

    if (timeView === 'daily') {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      filteredTransactions = transactions.filter(t => t.date === dateStr);
    } else if (timeView === 'weekly') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date + 'T00:00:00');
        return tDate >= weekStart && tDate <= weekEnd;
      });
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date + 'T00:00:00');
        return tDate >= monthStart && tDate <= monthEnd;
      });
    }

    // Apply recurring expense filter natively, except on the Daily view which always shows them
    if (timeView !== 'daily' && !includeRecurring) {
      filteredTransactions = filteredTransactions.filter(t => !t.isRecurring);
    }

    // Apply category filter
    if (selectedCategoryIds.length > 0) {
      filteredTransactions = filteredTransactions.filter(t =>
        selectedCategoryIds.includes(t.category)
      );
    }

    // Exclude skipped items from totals
    filteredTransactions = filteredTransactions.filter(t => !t.isSkipped);

    return filteredTransactions;
  };

  const currentFilteredTransactions = getCurrentFilteredTransactions();
  const currentTotal = currentFilteredTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);

  // Get display text for current period
  const getPeriodText = () => {
    if (timeView === 'daily') {
      return isToday(currentDate) ? 'today' : format(currentDate, 'MMM d, yyyy');
    } else if (timeView === 'weekly') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Time Selector + Total */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-6 pt-8 pb-6">
          {/* Segmented Control */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <div className="inline-flex bg-gray-100 rounded-lg p-1 mx-auto sm:mx-0">
              <button
                onClick={() => setTimeView('daily')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${timeView === 'daily'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600'
                  }`}
              >
                Daily
              </button>
              <button
                onClick={() => setTimeView('weekly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${timeView === 'weekly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600'
                  }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setTimeView('monthly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${timeView === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600'
                  }`}
              >
                Monthly
              </button>
            </div>

            {timeView !== 'daily' && (
              <div className="flex items-center justify-center sm:justify-end gap-2">
                <span className="text-sm text-gray-500 font-medium">Include recurring</span>
                <button
                  onClick={() => setIncludeRecurring(!includeRecurring)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none ${includeRecurring ? 'bg-black' : 'bg-gray-200'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeRecurring ? 'translate-x-[18px]' : 'translate-x-0.5'
                      }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Navigation and Total */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>

            <motion.div
              key={`${timeView}-${currentDate.toString()}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">
                {getPeriodText()}
              </div>
              <motion.div
                key={`${timeView}-${currentDate.toString()}-${selectedCategoryIds.join(',')}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className={`font-semibold text-gray-900 ${timeView === 'daily' ? 'text-lg' : timeView === 'weekly' ? 'text-2xl' : 'text-3xl'
                  }`}
              >
                ${currentTotal.toFixed(0)}
              </motion.div>
            </motion.div>

            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1">
                <button
                  onClick={handleNext}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Next period"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>

                <button
                  onClick={() => downloadICS(currentFilteredTransactions, categories, `Budget_${timeView}_Export`, selectedCategoryIds, recurringExceptions)}
                  className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-colors text-gray-400"
                  aria-label="Export to Calendar"
                  title="Export to Calendar"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
              <div className="text-[10px] text-gray-400 pr-2 mt-1 hidden sm:block">
                Re-exporting may create duplicates (iOS limitation)
              </div>
            </div>
          </div>
          <div className="text-[10px] text-gray-400 mt-2 text-center sm:hidden">
            Re-exporting may create duplicates (iOS import limitation).
          </div>
        </div>
      </div>

      {/* View Content */}
      <motion.div
        key={timeView}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="max-w-lg mx-auto"
      >
        {timeView === 'monthly' && (
          <div className="bg-white">
            <MonthlyCalendar currentDate={currentDate} onDayClick={handleDayClick} />
          </div>
        )}

        {timeView === 'weekly' && (
          <WeeklyCalendar currentDate={currentDate} onDayClick={handleDayClick} />
        )}

        {timeView === 'daily' && (
          <DailyView currentDate={currentDate} />
        )}
      </motion.div>

      {/* Category Filter */}
      <CategoryFilterBar />

      <BottomNav />
    </div>
  );
}