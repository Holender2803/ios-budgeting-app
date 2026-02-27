import { useParams, useNavigate } from 'react-router';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, Plus, Download, CheckSquare, X } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { useSelection } from '../context/SelectionContext';
import { TransactionItem } from '../components/TransactionItem';
import { BulkActionBar } from '../components/BulkActionBar';
import { motion, AnimatePresence } from 'motion/react';
import { downloadICS } from '../utils/icsExport';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';

export function DayDetail() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { transactions, categories, getCategoryById, recurringExceptions, setSelectedDate, bulkDeleteTransactions } = useExpense();
  const { isSelectionMode, toggleSelectionMode, selectedIds, clearSelection, selectAll } = useSelection();

  const [isDeleting, setIsDeleting] = useState(false);
  const [recurringOption, setRecurringOption] = useState<'single' | 'future' | 'all'>('single');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (date) {
      setSelectedDate(date);
    }
  }, [date, setSelectedDate]);

  if (!date) {
    navigate('/');
    return null;
  }

  const parsedDate = parseISO(date);
  const dayTransactions = transactions.filter((t) => t.date === date);
  const totalSpent = dayTransactions.reduce((sum, t) => sum + t.amount, 0);

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
      const t = transactions.find(x => x.id === id || id.startsWith(`${x.id}-`));
      return t?.isRecurring;
    });
  }, [selectedIds, transactions]);

  // Group transactions by category
  const transactionsByCategory: Record<string, { transactions: typeof dayTransactions; total: number }> = {};
  dayTransactions.forEach((t) => {
    if (!transactionsByCategory[t.category]) {
      transactionsByCategory[t.category] = { transactions: [], total: 0 };
    }
    transactionsByCategory[t.category].transactions.push(t);
    transactionsByCategory[t.category].total += t.amount;
  });

  // Sort categories by total (highest first)
  const sortedCategories = Object.entries(transactionsByCategory).sort((a, b) => b[1].total - a[1].total);

  const onBack = () => {
    if (isSelectionMode) {
      toggleSelectionMode(false);
      return;
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>

            <div className="flex items-center gap-2">
              {!isSelectionMode && (
                <>
                  <button
                    onClick={() => downloadICS(dayTransactions, categories, `Budget_Daily_${format(parsedDate, 'yyyyMMdd')}`, [], recurringExceptions)}
                    className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-colors text-gray-400"
                    aria-label="Export to Calendar"
                    title="Export to Calendar"
                  >
                    <Download className="w-6 h-6" />
                  </button>

                  <button
                    onClick={() => navigate('/add', { state: { date } })}
                    className="p-2 hover:bg-blue-50 rounded-full transition-colors text-blue-500"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </>
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

          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              {format(parsedDate, 'EEEE')}
            </h1>
            <p className="text-gray-500">{format(parsedDate, 'MMMM d, yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="max-w-lg mx-auto px-4 mt-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-center shadow-lg shadow-blue-500/20">
          <p className="text-white/80 text-sm mb-1 font-medium">Total Spent</p>
          <p className="text-white text-4xl font-bold">
            ${totalSpent.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Transactions Grouped by Category */}
      <div className="max-w-lg mx-auto px-4 py-8">
        {dayTransactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4 font-medium">No expenses yet</p>
            {!isSelectionMode && (
              <button
                onClick={() => navigate('/add', { state: { date } })}
                className="px-6 py-3 bg-blue-500 text-white rounded-2xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
              >
                Add First Expense
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-8">
            {isSelectionMode && (
              <div className="flex justify-end">
                <button
                  onClick={() => selectAll(dayTransactions.map(t => t.id))}
                  className="text-xs font-bold text-blue-600 uppercase tracking-widest"
                >
                  Select All
                </button>
              </div>
            )}
            {sortedCategories.map(([categoryId, { transactions: categoryTransactions, total }], categoryIndex) => {
              const category = getCategoryById(categoryId);
              if (!category) return null;

              return (
                <motion.div
                  key={categoryId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: categoryIndex * 0.1 }}
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full shadow-sm"
                        style={{ backgroundColor: category.color }}
                      />
                      <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest">{category.name}</h3>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      ${total.toFixed(2)}
                    </span>
                  </div>

                  {/* Transactions in this category */}
                  <div className="space-y-3">
                    {categoryTransactions.map((transaction, index) => (
                      <motion.div
                        key={transaction.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: categoryIndex * 0.1 + index * 0.05 }}
                      >
                        <TransactionItem
                          transaction={transaction}
                          onClick={() => navigate(`/transaction/${transaction.id}`)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

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