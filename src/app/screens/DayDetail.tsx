import { useParams, useNavigate } from 'react-router';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, Plus, Download } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { TransactionItem } from '../components/TransactionItem';
import { motion } from 'motion/react';
import { downloadICS } from '../utils/icsExport';

export function DayDetail() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { transactions, categories, getCategoryById, recurringExceptions } = useExpense();

  if (!date) {
    navigate('/');
    return null;
  }

  const parsedDate = parseISO(date);
  const dayTransactions = transactions.filter((t) => t.date === date);
  const totalSpent = dayTransactions.reduce((sum, t) => sum + t.amount, 0);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>

            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1">
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
              </div>
            </div>
          </div>
          <div className="text-[10px] text-gray-400 text-center mb-4">
            Re-exporting may create duplicates (iOS import limitation).
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              {format(parsedDate, 'EEEE')}
            </h1>
            <p className="text-gray-500">{format(parsedDate, 'MMMM d, yyyy')}</p>
          </div>

          <div className="mt-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-center">
            <p className="text-white/80 text-sm mb-1">Total Spent</p>
            <p className="text-white text-4xl font-bold">
              ${totalSpent.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Transactions Grouped by Category */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {dayTransactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">No expenses yet</p>
            <button
              onClick={() => navigate('/add', { state: { date } })}
              className="px-6 py-3 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 transition-colors"
            >
              Add First Expense
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
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
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <h3 className="font-medium text-gray-900">{category.name}</h3>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      ${total.toFixed(2)}
                    </span>
                  </div>

                  {/* Transactions in this category */}
                  <div className="space-y-2">
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
    </div>
  );
}