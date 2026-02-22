import { format } from 'date-fns';
import { useNavigate } from 'react-router';
import { useExpense } from '../context/ExpenseContext';
import { TransactionItem } from './TransactionItem';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';

interface DailyViewProps {
  currentDate: Date;
}

export function DailyView({ currentDate }: DailyViewProps) {
  const navigate = useNavigate();
  const { transactions, getCategoryById, selectedCategoryIds } = useExpense();

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  let dayTransactions = transactions.filter(t => t.date === dateStr);

  // Apply category filter
  if (selectedCategoryIds.length > 0) {
    dayTransactions = dayTransactions.filter(t => selectedCategoryIds.includes(t.category));
  }

  // Exclude skipped items from totals
  dayTransactions = dayTransactions.filter(t => !t.isSkipped);

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
    <div className="px-6 py-4">
      {dayTransactions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm mb-6">No expenses</p>
          <button
            onClick={() => navigate('/add', { state: { date: dateStr } })}
            className="px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Add Expense
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
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.08 }}
              >
                {/* Category Header - Subtle */}
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full opacity-60"
                      style={{ backgroundColor: category.color }}
                    />
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {category.name}
                    </h3>
                  </div>
                  <span className="text-sm font-semibold text-gray-600">
                    ${total.toFixed(0)}
                  </span>
                </div>

                {/* Transactions in this category */}
                <div className="space-y-1.5">
                  {categoryTransactions.map((transaction, index) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: categoryIndex * 0.08 + index * 0.03 }}
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
  );
}
