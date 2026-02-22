import { useParams, useNavigate } from 'react-router';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ChevronLeft } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { motion } from 'motion/react';
import * as LucideIcons from 'lucide-react';

export function WeeklyView() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { transactions, categories, getCategoryById } = useExpense();

  if (!date) {
    navigate('/');
    return null;
  }

  const parsedDate = parseISO(date);
  const weekStart = startOfWeek(parsedDate);
  const weekEnd = endOfWeek(parsedDate);
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Calculate week total
  const weekTransactions = transactions.filter(t => {
    const tDate = new Date(t.date + 'T00:00:00');
    return tDate >= weekStart && tDate <= weekEnd;
  });
  const weekTotal = weekTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Get data for each day
  const getDayData = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayTransactions = transactions.filter(t => t.date === dateStr);
    const dayTotal = dayTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Group by category
    const categoriesMap: Record<string, { amount: number; count: number }> = {};
    dayTransactions.forEach(t => {
      if (!categoriesMap[t.category]) {
        categoriesMap[t.category] = { amount: 0, count: 0 };
      }
      categoriesMap[t.category].amount += t.amount;
      categoriesMap[t.category].count += 1;
    });

    // Sort categories by amount
    const sortedCategories = Object.entries(categoriesMap)
      .map(([categoryId, data]) => ({
        category: getCategoryById(categoryId),
        amount: data.amount,
        count: data.count,
      }))
      .filter(item => item.category !== null)
      .sort((a, b) => b.amount - a.amount);

    return {
      dateStr,
      dayTotal,
      categories: sortedCategories,
      hasTransactions: dayTransactions.length > 0,
    };
  };

  const IconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="w-3.5 h-3.5" /> : null;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="max-w-lg mx-auto px-6 pb-8 pt-2">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-2">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </div>
            <div className="text-3xl font-semibold text-gray-900">
              ${weekTotal.toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Days List */}
      <div className="max-w-lg mx-auto px-6 mt-6">
        <div className="space-y-6">
          {daysInWeek.map((day, dayIndex) => {
            const dayData = getDayData(day);

            return (
              <motion.div
                key={day.toString()}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dayIndex * 0.05 }}
              >
                {/* Day Block */}
                <button
                  onClick={() => navigate(`/day/${dayData.dateStr}`)}
                  className="w-full bg-white rounded-2xl p-5 hover:shadow-sm transition-all text-left"
                >
                  {/* Day Header */}
                  <div className="flex items-baseline justify-between mb-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-medium text-gray-900">
                        {format(day, 'EEEE')}
                      </span>
                      <span className="text-sm text-gray-400">
                        {format(day, 'MMM d')}
                      </span>
                    </div>
                    {dayData.hasTransactions && (
                      <span className="text-lg font-semibold text-gray-900">
                        ${dayData.dayTotal.toFixed(0)}
                      </span>
                    )}
                  </div>

                  {/* Categories List */}
                  {dayData.hasTransactions ? (
                    <div className="space-y-2">
                      {dayData.categories.map((item, idx) => {
                        if (!item.category) return null;
                        
                        return (
                          <div
                            key={item.category.id}
                            className="flex items-center justify-between py-1"
                          >
                            <div className="flex items-center gap-2">
                              <span style={{ color: item.category.color }} className="opacity-70">
                                {IconComponent(item.category.icon)}
                              </span>
                              <span className="text-sm text-gray-700">
                                {item.category.name}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">
                              ${item.amount.toFixed(0)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">
                      No expenses
                    </div>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
