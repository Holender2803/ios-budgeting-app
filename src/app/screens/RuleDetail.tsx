import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, Trash2, Edit3, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, isBefore, startOfToday, addDays } from 'date-fns';
import { toast } from 'sonner';

export function RuleDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
    const { transactions, categories, stopRecurringRule, deleteTransaction, updateTransaction, addTransaction } = useExpense();

    const rule = transactions.find((t) => t.id === id && t.isRecurring && !t.isVirtual);

    if (!rule) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
                <p className="text-gray-500 mb-4">Rule not found or already deleted.</p>
                <button onClick={() => navigate('/settings/recurring')} className="text-blue-500 font-semibold">Back to list</button>
            </div>
        );
    }

    const category = categories.find(c => c.id === rule.category);
    const today = startOfToday();

    // Get all occurrences for this rule
    const allOccurrences = transactions.filter(t => t.isVirtual && t.id.startsWith(`${rule.id}-`));
    const pastOccurrences = allOccurrences.filter(t => isBefore(parseISO(t.date), today)).sort((a, b) => b.date.localeCompare(a.date));
    const upcomingOccurrences = allOccurrences.filter(t => !isBefore(parseISO(t.date), today)).sort((a, b) => a.date.localeCompare(b.date));

    const handleDelete = () => {
        if (window.confirm('Stop this series? This will remove all future occurrences but keep your past spending history.')) {
            stopRecurringRule(rule.id);
            toast.success('Series stopped');
            navigate('/settings/recurring');
        }
    };

    const handleEdit = () => {
        // For now, let's navigate to the standard TransactionEdit screen.
        // However, we need to ensure that the "Save" logic in TransactionEdit or the Context 
        // handles the "future-only" split if we want to be strict.
        // The user says: "Editing a recurring rule must NOT change past transactions."
        // "If amount/category/vendor changes, apply only to future occurrences from “today” onward."

        // To keep it simple but functional, I'll pass a flag or just handle it in the standard Edit screen 
        // by checking if it's a recurring rule and applying the split logic if needed.
        navigate(`/transaction/${rule.id}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-lg mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate('/settings/recurring')}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6 text-gray-600" />
                        </button>
                        <h1 className="text-lg font-semibold text-gray-900 truncate px-4">{rule.vendor}</h1>
                        <div className="flex items-center gap-1">
                            <button onClick={handleEdit} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <Edit3 className="w-5 h-5 text-gray-600" />
                            </button>
                            <button onClick={handleDelete} className="p-2 hover:bg-red-50 rounded-full transition-colors">
                                <Trash2 className="w-5 h-5 text-red-500" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 py-8">
                {/* Rule Summary Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center"
                            style={{ backgroundColor: category ? `${category.color}15` : '#f3f4f6' }}
                        >
                            <Calendar className="w-8 h-8" style={{ color: category?.color || '#94a3b8' }} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">${rule.amount.toFixed(2)}</p>
                            <p className="text-sm text-gray-500 capitalize">{rule.recurrenceType} • {category?.name}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-50">
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Started</p>
                            <p className="text-sm font-medium text-gray-700">{format(parseISO(rule.date), 'MMM d, yyyy')}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Status</p>
                            <p className={`text-sm font-medium ${rule.isActive !== false ? 'text-green-600' : 'text-gray-400'}`}>
                                {rule.isActive !== false ? 'Active' : 'Ended'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'upcoming' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                    >
                        <Clock className="w-4 h-4" />
                        Upcoming
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'past' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Past
                    </button>
                </div>

                {/* List Content */}
                <div className="space-y-3">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: activeTab === 'upcoming' ? -10 : 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: activeTab === 'upcoming' ? 10 : -10 }}
                            className="space-y-4"
                        >
                            {(activeTab === 'upcoming' ? upcomingOccurrences : pastOccurrences).length === 0 ? (
                                <p className="text-center py-12 text-gray-400 text-sm">No {activeTab} occurrences found.</p>
                            ) : (
                                (activeTab === 'upcoming' ? upcomingOccurrences : pastOccurrences).map(occ => (
                                    <div key={occ.id} className={`bg-white rounded-2xl p-4 flex items-center justify-between border border-transparent ${occ.isSkipped ? 'opacity-50' : ''}`}>
                                        <div>
                                            <p className="font-semibold text-gray-900">{format(parseISO(occ.date), 'MMMM d, yyyy')}</p>
                                            <p className="text-xs text-gray-400">{occ.isSkipped ? 'Skipped' : 'Scheduled'}</p>
                                        </div>
                                        <p className={`font-bold ${occ.isSkipped ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                            ${occ.amount.toFixed(2)}
                                        </p>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
