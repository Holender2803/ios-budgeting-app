import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Transaction } from '../../types';
import { format, parseISO } from 'date-fns';

interface MerchantDetailSheetProps {
    isOpen: boolean;
    onClose: () => void;
    merchantName: string;
    transactions: Transaction[];
    totalAmount: number;
}

export function MerchantDetailSheet({ isOpen, onClose, merchantName, transactions, totalAmount }: MerchantDetailSheetProps) {
    if (!merchantName) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 z-60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-60 flex flex-col font-dm-sans shadow-2xl safe-area-bottom h-[85vh]"
                    >
                        <div className="flex-none p-6 pb-4 border-b border-gray-100 flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full flex flex-none items-center justify-center bg-gray-100 text-gray-500 text-xl font-bold shadow-inner">
                                    {merchantName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-[22px] font-bold text-gray-900 leading-tight">
                                        {merchantName}
                                    </h2>
                                    <p className="text-[14px] font-bold text-gray-500 mt-1">
                                        ${totalAmount.toFixed(0)} spent · {transactions.length} {transactions.length === 1 ? 'purchase' : 'purchases'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 mt-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                                Transaction History
                            </h3>

                            <div className="space-y-4">
                                {transactions.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-6">No transactions found.</p>
                                ) : (
                                    transactions.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                                        <div key={t.id} className="flex items-center justify-between pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                            <div className="flex flex-col min-w-0 pr-4">
                                                <span className="text-[15px] font-bold text-gray-900 truncate">
                                                    {format(parseISO(t.date), 'MMM d, yyyy')}
                                                </span>
                                                <span className="text-[13px] text-gray-500 mt-0.5 font-medium">
                                                    {t.isRecurring ? 'Recurring expense' : 'One-off expense'}
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
