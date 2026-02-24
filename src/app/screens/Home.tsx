import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isToday, startOfDay, endOfDay } from 'date-fns';
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
  const { transactions: processedTransactions, categories, selectedCategoryIds, setSelectedCategories, recurringExceptions, includeRecurring, setIncludeRecurring, filteredTransactions: allFilteredTransactions, setSelectedDate } = useExpense();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeView, setTimeView] = useState<TimeView>('monthly');

  // Sync selectedDate with currentDate whenever currentDate changes
  useEffect(() => {
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  }, [currentDate, setSelectedDate]);

  // Navigation handlers
  const handlePrev = () => {
    setSelectedCategories([]); // Reset filter on period change
    if (timeView === 'daily') {
      setCurrentDate(prev => subDays(prev, 1));
    } else if (timeView === 'weekly') {
      setCurrentDate(prev => subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => subMonths(prev, 1));
    }
  };

  const handleNext = () => {
    setSelectedCategories([]); // Reset filter on period change
    if (timeView === 'daily') {
      setCurrentDate(prev => addDays(prev, 1));
    } else if (timeView === 'weekly') {
      setCurrentDate(prev => addWeeks(prev, 1));
    } else {
      setCurrentDate(prev => addMonths(prev, 1));
    }
  };

  const handleDayClick = (date: string) => {
    setSelectedCategories([]); // Reset filter when drilling down to a day
    navigate(`/day/${date}`);
  };

  // Pipeline Phase 3 & 4: Range Derivation & Filtering
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (timeView === 'daily') {
      return { rangeStart: startOfDay(currentDate), rangeEnd: endOfDay(currentDate) };
    } else if (timeView === 'weekly') {
      return { rangeStart: startOfWeek(currentDate), rangeEnd: endOfWeek(currentDate) };
    } else {
      return { rangeStart: startOfMonth(currentDate), rangeEnd: endOfMonth(currentDate) };
    }
  }, [currentDate, timeView]);

  const rangeTransactions = useMemo(() => {
    return allFilteredTransactions.filter(t => {
      const tDate = new Date(t.date + 'T00:00:00');
      return tDate >= rangeStart && tDate <= rangeEnd;
    });
  }, [allFilteredTransactions, rangeStart, rangeEnd]);

  // For the filter list, we need transactions filtered by range/recurring but NOT by category
  const rangeTransactionsUnfiltered = useMemo(() => {
    return (processedTransactions as any[]).filter(t => {
      const tDate = new Date(t.date + 'T00:00:00');
      const inRange = tDate >= rangeStart && tDate <= rangeEnd;
      // Also respect the "Include recurring" toggle in the filter counts
      const recurringMatch = includeRecurring || !t.isRecurring;
      return inRange && recurringMatch && !t.isSkipped;
    });
  }, [processedTransactions, rangeStart, rangeEnd, includeRecurring]);

  const currentTotal = rangeTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);

  // Get display text for current period
  const getPeriodText = () => {
    if (timeView === 'daily') {
      return isToday(currentDate) ? 'today' : format(currentDate, 'MMM d, yyyy');
    } else if (timeView === 'weekly') {
      return `${format(rangeStart, 'MMM d')} – ${format(rangeEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50 overflow-hidden">
      {/* Row 1: Frozen Header */}
      <div className="flex-none bg-white border-b border-gray-100 z-20 shadow-sm">
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
                  onClick={() => downloadICS(rangeTransactions, categories, `Budget_${timeView}_Export`, selectedCategoryIds, recurringExceptions)}
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

      {/* Row 2: Scrollable content */}
      <div className={`flex-1 min-h-0 ${timeView === 'monthly' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <motion.div
          key={timeView}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="max-w-lg mx-auto pb-10"
        >
          {timeView === 'monthly' && (
            <div className="bg-white">
              <MonthlyCalendar
                currentDate={currentDate}
                onDayClick={handleDayClick}
                transactions={allFilteredTransactions}
              />
            </div>
          )}

          {timeView === 'weekly' && (
            <WeeklyCalendar
              currentDate={currentDate}
              onDayClick={handleDayClick}
              transactions={rangeTransactions}
            />
          )}

          {timeView === 'daily' && (
            <DailyView
              currentDate={currentDate}
              transactions={rangeTransactions}
            />
          )}
        </motion.div>
      </div>

      {/* Row 3: Frozen Footer (Filter + Nav) */}
      <div className="flex-none bg-white border-t border-gray-100 z-20">
        <CategoryFilterBar transactions={rangeTransactionsUnfiltered} />
        <BottomNav />
      </div>
    </div>
  );
}