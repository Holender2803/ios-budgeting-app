import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight } from 'lucide-react';
import { Transaction, Category } from '../../types';
import { useState } from 'react';
import { MerchantDetailSheet } from './MerchantDetailSheet';

interface MerchantListSheetProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    categories: Category[];
}

export function MerchantListSheet({ isOpen, onClose, transactions, categories }: MerchantListSheetProps) {
    const [selectedMerchant, setSelectedMerchant] = useState<{ name: string, amount: number } | null>(null);

    if (!isOpen && !selectedMerchant) return null;

    // Compute all merchants
    const vendorsMap: Record<string, { total: number, count: number, categoryId: string }> = {};

    transactions.forEach(t => {
        if (!t.vendor) return;
        if (!vendorsMap[t.vendor]) {
            vendorsMap[t.vendor] = { total: 0, count: 0, categoryId: t.category };
        }
        vendorsMap[t.vendor].total += t.amount;
        vendorsMap[t.vendor].count += 1;
    });

    const sortedVendors = Object.entries(vendorsMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total);

    return (
        <>
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
                            <div className="flex-none p-6 pb-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10 rounded-t-[24px]">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 leading-tight">All Merchants</h2>
                                    <p className="text-sm text-gray-400 mt-1">{sortedVendors.length} total vendors</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-2 scrollbar-none">
                                <div className="divide-y divide-gray-50">
                                    {sortedVendors.map((vendor) => {
                                        const category = categories.find(c => c.id === vendor.categoryId);
                                        return (
                                            <div
                                                key={vendor.name}
                                                className="py-4 flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all"
                                                onClick={() => setSelectedMerchant({ name: vendor.name, amount: vendor.total })}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm text-sm font-bold"
                                                        style={{
                                                            backgroundColor: category?.color ? `${category.color}15` : '#F1F5F9',
                                                            color: category?.color || '#64748B'
                                                        }}
                                                    >
                                                        {vendor.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-[15px] font-bold text-gray-900 leading-none mb-1.5 group-hover:text-blue-600 transition-colors">
                                                            {vendor.name}
                                                        </div>
                                                        <div className="text-[13px] font-medium text-gray-400">
                                                            {vendor.count} {vendor.count === 1 ? 'purchase' : 'purchases'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-[16px] font-bold text-gray-900">
                                                        ${vendor.total.toFixed(0)}
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <MerchantDetailSheet
                isOpen={selectedMerchant !== null}
                onClose={() => setSelectedMerchant(null)}
                merchantName={selectedMerchant?.name || ''}
                transactions={selectedMerchant ? transactions.filter(t => t.vendor === selectedMerchant.name) : []}
                totalAmount={selectedMerchant?.amount || 0}
            />
        </>
    );
}
