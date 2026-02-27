import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isToday, startOfDay, endOfDay } from 'date-fns';
import { MonthlyCalendar } from '../components/MonthlyCalendar';
import { WeeklyCalendar } from '../components/WeeklyCalendar';
import { DailyView } from '../components/DailyView';
import { CategoryFilterBar } from '../components/CategoryFilterBar';
import { BottomNav } from '../components/BottomNav';
import { useExpense } from '../context/ExpenseContext';
import { useSelection } from '../context/SelectionContext';
import { BulkActionBar } from '../components/BulkActionBar';
import { TransactionItem } from '../components/TransactionItem';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Download, CheckSquare, X } from 'lucide-react';
import { downloadICS } from '../utils/icsExport';
import { toast } from 'sonner';

type TimeView = 'daily' | 'weekly' | 'monthly';

export function Home() {
  const navigate = useNavigate();
  const { transactions: processedTransactions, categories, selectedCategoryIds, setSelectedCategories, recurringExceptions, includeRecurring, setIncludeRecurring, filteredTransactions: allFilteredTransactions, setSelectedDate, bulkDeleteTransactions } = useExpense();
  const { isSelectionMode, toggleSelectionMode, selectedIds, clearSelection, selectAll } = useSelection();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeView, setTimeView] = useState<TimeView>('monthly');
  const [isDeleting, setIsDeleting] = useState(false);
  const [recurringOption, setRecurringOption] = useState<'single' | 'future' | 'all'>('single');
  const [showConfirm, setShowConfirm] = useState(false);

  // Sync selectedDate with currentDate whenever currentDate changes
  useEffect(() => {
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  }, [currentDate, setSelectedDate]);

  // Navigation handlers
  const handlePrev = () => {
    if (isSelectionMode) return;
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
    if (isSelectionMode) return;
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
    if (isSelectionMode) {
      // Toggle all transactions for this day
      const dayTransactions = allFilteredTransactions.filter(t => t.date === date);
      const dayIds = dayTransactions.map(t => t.id);
      const allSelected = dayIds.every(id => selectedIds.includes(id));

      if (allSelected) {
        // Deselect all for this day - not directly supported by selectAll helper in context but we can clear individually
        // For now let's just use selectAll to add
        selectAll(dayIds);
      } else {
        selectAll(dayIds);
      }
      return;
    }
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

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await bulkDeleteTransactions(selectedIds, recurringOption);
      clearSelection();
      toggleSelectionMode(false);
      setShowConfirm(false);
    } catch (error) {
      toast.error('Failed to delete items');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasRecurring = useMemo(() => {
    return selectedIds.some(id => {
      const t = processedTransactions.find(x => x.id === id || id.startsWith(`${x.id}-`));
      return t?.isRecurring;
    });
  }, [selectedIds, processedTransactions]);

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50 overflow-hidden relative">
      {/* Row 1: Frozen Header */}
      <div className="flex-none bg-white border-b border-gray-100 z-30 shadow-sm">
        <div className="max-w-lg mx-auto px-6 pt-8 pb-6">
          {/* Segmented Control */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <div className={`inline-flex bg-gray-100 rounded-lg p-1 mx-auto sm:mx-0 transition-opacity ${isSelectionMode ? 'opacity-50 pointer-events-none' : ''}`}>
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

            <div className="flex items-center justify-between sm:justify-end gap-4">
              {timeView !== 'daily' && !isSelectionMode && (
                <div className="flex items-center gap-2">
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

              <button
                onClick={() => toggleSelectionMode()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${isSelectionMode
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {isSelectionMode ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    Done
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    Select
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Navigation and Total */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={isSelectionMode}
              className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${isSelectionMode ? 'opacity-20 cursor-not-allowed' : ''}`}
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
                  disabled={isSelectionMode}
                  className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${isSelectionMode ? 'opacity-20 cursor-not-allowed' : ''}`}
                  aria-label="Next period"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>

                <button
                  onClick={() => downloadICS(rangeTransactions, categories, `Budget_${timeView}_Export`, selectedCategoryIds, recurringExceptions)}
                  disabled={isSelectionMode}
                  className={`p-2 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-colors text-gray-400 ${isSelectionMode ? 'opacity-20 cursor-not-allowed' : ''}`}
                  aria-label="Export to Calendar"
                  title="Export to Calendar"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Scrollable content */}
      <div className={`flex-1 min-h-0 ${timeView === 'monthly' && !isSelectionMode ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <motion.div
          key={timeView}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="max-w-lg mx-auto pb-32"
        >
          {isSelectionMode && timeView !== 'daily' && (
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                  Expenses in this {timeView === 'weekly' ? 'week' : 'month'}
                </h3>
                <button
                  onClick={() => selectAll(rangeTransactions.map(t => t.id))}
                  className="text-xs font-bold text-blue-600"
                >
                  Select All
                </button>
              </div>
              <div className="space-y-2">
                {rangeTransactions.map((t) => (
                  <TransactionItem
                    key={t.id}
                    transaction={t}
                    onClick={() => { }} // Controlled by selection mode
                  />
                ))}
              </div>
            </div>
          )}

          {!isSelectionMode && timeView === 'monthly' && (
            <div className="bg-white">
              <MonthlyCalendar
                currentDate={currentDate}
                onDayClick={handleDayClick}
                transactions={allFilteredTransactions}
              />
            </div>
          )}

          {!isSelectionMode && timeView === 'weekly' && (
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
      <div className={`flex-none bg-white border-t border-gray-100 z-20 transition-transform ${isSelectionMode && selectedIds.length > 0 ? 'translate-y-full' : ''}`}>
        <CategoryFilterBar transactions={rangeTransactionsUnfiltered} />
        <BottomNav />
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar onDelete={() => setShowConfirm(true)} />

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 100, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 100, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Delete {selectedIds.length} {selectedIds.length === 1 ? 'expense' : 'expenses'}?
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                This action cannot be undone.
              </p>

              {hasRecurring && (
                <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-2xl">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recurring Strategy</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer group">
                      <input
                        type="radio"
                        name="recurringOption"
                        value="single"
                        checked={recurringOption === 'single'}
                        onChange={(e) => setRecurringOption(e.target.value as any)}
                        className="w-4 h-4 text-black focus:ring-black"
                      />
                      <span className="text-sm font-medium text-gray-700">This occurrence only</span>
                    </label>
                    <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer group">
                      <input
                        type="radio"
                        name="recurringOption"
                        value="future"
                        checked={recurringOption === 'future'}
                        onChange={(e) => setRecurringOption(e.target.value as any)}
                        className="w-4 h-4 text-black focus:ring-black"
                      />
                      <span className="text-sm font-medium text-gray-700">This and future occurrences</span>
                    </label>
                    <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer group">
                      <input
                        type="radio"
                        name="recurringOption"
                        value="all"
                        checked={recurringOption === 'all'}
                        onChange={(e) => setRecurringOption(e.target.value as any)}
                        className="w-4 h-4 text-black focus:ring-black"
                      />
                      <span className="text-sm font-medium text-gray-700">Entire series</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-900 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}