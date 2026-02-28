import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Transaction, Category } from '../../types';
import { format, parseISO } from 'date-fns';

interface CategoryDetailSheetProps {
    isOpen: boolean;
    onClose: () => void;
    category: Category | null;
    transactions: Transaction[]; // Only transactions for this category in the selected period
    totalAmount: number;
}

export function CategoryDetailSheet({ isOpen, onClose, category, transactions, totalAmount }: CategoryDetailSheetProps) {
    if (!category) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-50 flex flex-col font-dm-sans shadow-2xl safe-area-bottom h-[85vh]"
                    >
                        <div className="flex-none p-6 pb-4 border-b border-gray-100 flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-[12px] flex items-center justify-center shadow-sm"
                                    style={{ backgroundColor: category.color + '20' }} // 20 is hex opacity 12%
                                >
                                    <div
                                        className="w-3.5 h-3.5 rounded-full"
                                        style={{ backgroundColor: category.color }}
                                    />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 leading-tight">
                                        {category.name}
                                    </h2>
                                    <p className="text-[13px] font-bold text-gray-500 mt-0.5">
                                        ${totalAmount.toFixed(0)} spent
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                                Transactions ({transactions.length})
                            </h3>

                            <div className="space-y-4">
                                {transactions.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-6">No transactions found.</p>
                                ) : (
                                    transactions.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                                        <div key={t.id} className="flex items-center justify-between pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                            <div className="flex flex-col min-w-0 pr-4">
                                                <span className="text-[15px] font-bold text-gray-900 truncate">
                                                    {t.vendor || 'Unknown Vendor'}
                                                </span>
                                                <span className="text-[13px] text-gray-500 mt-0.5 font-medium">
                                                    {format(parseISO(t.date), 'MMM d, yyyy')}
                                                    {t.isRecurring && ' • Recurring'}
                                                </span>
                                            </div>
                                            <span className="text-[15px] font-bold text-gray-900 flex-none leading-none">
                                                ${t.amount.toFixed(0)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
