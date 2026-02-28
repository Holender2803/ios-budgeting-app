import { useState, useMemo } from 'react';
import { Transaction, Category } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import { CategoryDetailSheet } from './CategoryDetailSheet';

interface CategoryBreakdownProps {
    transactions: Transaction[];
    categories: Category[];
}

export function CategoryBreakdown({ transactions, categories }: CategoryBreakdownProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<{ id: string, amount: number } | null>(null);

    const { data, totalSpent } = useMemo(() => {
        const counts: Record<string, number> = {};
        let total = 0;

        transactions.forEach(t => {
            counts[t.category] = (counts[t.category] || 0) + t.amount;
            total += t.amount;
        });

        const breakdown = Object.entries(counts)
            .map(([categoryId, amount]) => {
                const category = categories.find(c => c.id === categoryId);
                return {
                    id: categoryId,
                    name: category?.name || 'Unknown',
                    color: category?.color || '#94A3B8',
                    amount,
                    percentage: total > 0 ? (amount / total) * 100 : 0
                };
            })
            .sort((a, b) => b.amount - a.amount);

        return { data: breakdown, totalSpent: total };
    }, [transactions, categories]);

    if (data.length === 0) return null;

    const displayData = isExpanded ? data : data.slice(0, 5);
    const hiddenCount = data.length > 5 ? data.length - 5 : 0;

    return (
        <>
            <div className="bg-white p-5 rounded-[16px] shadow-sm flex flex-col w-full font-dm-sans">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest">
                        By Category
                    </h3>
                    <span className="text-xs font-bold text-gray-900">${totalSpent.toFixed(0)}</span>
                </div>

                <div className="space-y-4">
                    <AnimatePresence initial={false}>
                        {displayData.map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, delay: isExpanded ? index * 0.05 : 0 }}
                                className="group relative cursor-pointer block"
                                onClick={() => setSelectedCategory({ id: item.id, amount: item.amount })}
                            >
                                <div className="flex items-center justify-between mb-1.5 z-10 relative">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-2.5 h-2.5 rounded-full shadow-sm"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <span className="text-sm font-semibold text-gray-700 truncate max-w-[140px] group-hover:text-blue-600 transition-colors">
                                            {item.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-bold text-gray-900">
                                            ${item.amount.toFixed(0)}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                                    </div>
                                </div>

                                <div className="w-full h-[6px] bg-gray-100 rounded-[3px] overflow-hidden ml-1">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(item.percentage, 2)}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                        className="h-full rounded-[3px] transition-all"
                                        style={{ backgroundColor: item.color }}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {hiddenCount > 0 && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="mt-6 flex items-center justify-center gap-1.5 text-sm font-bold text-gray-400 hover:text-gray-600 active:scale-95 transition-all w-full"
                    >
                        {isExpanded ? (
                            <>
                                Show less <ChevronUp className="w-4 h-4 ml-0.5" />
                            </>
                        ) : (
                            <>
                                Show {hiddenCount} more {hiddenCount === 1 ? 'category' : 'categories'} <ChevronDown className="w-4 h-4 ml-0.5" />
                            </>
                        )}
                    </button>
                )}
            </div>

            <CategoryDetailSheet
                isOpen={selectedCategory !== null}
                onClose={() => setSelectedCategory(null)}
                category={selectedCategory ? categories.find(c => c.id === selectedCategory.id) || null : null}
                transactions={selectedCategory ? transactions.filter(t => t.category === selectedCategory.id) : []}
                totalAmount={selectedCategory?.amount || 0}
            />
        </>
    );
}
