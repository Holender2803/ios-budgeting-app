import { useNavigate } from 'react-router';
import { ChevronLeft, Repeat, ChevronRight } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';

export function RecurringRules() {
    const navigate = useNavigate();
    const { transactions, categories } = useExpense();

    // Filter for unique recurring rules (base transactions only)
    // We only show rules that haven't been fully deactivated/ended in the far past, 
    // but for the management list, showing all "active" or "recently active" rules is good.
    const rules = transactions.filter(t => t.isRecurring && !t.isVirtual);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-lg mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/settings')}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6 text-gray-600" />
                        </button>
                        <h1 className="text-xl font-semibold text-gray-900">Recurring Payments</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 py-6">
                {rules.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Repeat className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium">No recurring rules found</p>
                        <p className="text-sm text-gray-400 mt-1">Add one in the Add Expense screen</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rules.map((rule) => {
                            const category = categories.find(c => c.id === rule.category);
                            return (
                                <motion.button
                                    key={rule.id}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate(`/settings/recurring/${rule.id}`)}
                                    className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-transparent hover:border-gray-200 transition-all text-left"
                                >
                                    <div
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: category ? `${category.color}15` : '#f3f4f6' }}
                                    >
                                        <Repeat className="w-6 h-6" style={{ color: category?.color || '#94a3b8' }} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-gray-900 truncate">{rule.vendor}</p>
                                            <p className="font-bold text-gray-900">${rule.amount.toFixed(2)}</p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-500 capitalize">{rule.recurrenceType}</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                            <span className="text-xs text-gray-400">
                                                Started {format(parseISO(rule.date), 'MMM d, yyyy')}
                                            </span>
                                            {rule.endDate && (
                                                <>
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                    <span className="text-xs text-orange-500">
                                                        Ends {format(parseISO(rule.endDate), 'MMM d, yyyy')}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
                                </motion.button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
