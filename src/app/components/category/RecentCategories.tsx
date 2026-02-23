import React, { useEffect, useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import { useExpense } from '../../context/ExpenseContext';
import { storage } from '../../utils/storage';

interface RecentCategoriesProps {
    selectedCategoryId: string;
    vendor?: string;
    onSelect: (categoryId: string) => void;
    onBrowseAll: () => void;
}

const RECENT_LIMIT = 5;
const STORAGE_KEY = 'recent_categories';

export function RecentCategories({
    vendor,
    selectedCategoryId,
    onSelect,
    onBrowseAll,
}: RecentCategoriesProps) {
    const { categories, transactions, getSuggestedCategory } = useExpense();
    const [recentIds, setRecentIds] = useState<string[]>([]);

    // We'll get the vendor from context if possible, but the prop usually comes from parent
    // However, the component name is still RecentCategories for now to keep imports working.
    // In a full refactor we might rename to QuickCategories.

    // 1. Load recents from storage
    useEffect(() => {
        const loadRecent = async () => {
            const stored = await storage.get<string[]>(STORAGE_KEY, 'list') || [];

            const fromTransactions = [...transactions]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(t => t.category)
                .filter((id, index, self) =>
                    self.indexOf(id) === index &&
                    categories.some(c => c.id === id)
                );

            const merged = [...new Set([...stored, ...fromTransactions])].slice(0, RECENT_LIMIT);
            setRecentIds(merged);
        };

        loadRecent();
    }, [transactions.length, categories.length]);

    // 2. Compute what to show
    const displayCategories = useMemo(() => {
        let ids = [...recentIds];

        // Add suggestion at the front if exists
        const suggestedId = vendor ? getSuggestedCategory(vendor) : null;
        if (suggestedId) {
            ids = [suggestedId, ...ids.filter(id => id !== suggestedId)];
        }

        // If we have fewer than 5, fill with sensible defaults
        if (ids.length < RECENT_LIMIT) {
            const defaults = ['cat-food', 'cat-groceries', 'cat-shopping', 'cat-transport', 'cat-coffee'];
            const fill = defaults.filter(d => !ids.includes(d) && d !== suggestedId);
            ids = [...ids, ...fill].slice(0, RECENT_LIMIT);
        }

        return ids.slice(0, RECENT_LIMIT)
            .map(id => categories.find(c => c.id === id))
            .filter(Boolean);
    }, [recentIds, categories, vendor, getSuggestedCategory]);

    // Update recents when selected
    useEffect(() => {
        if (!selectedCategoryId) return;
        setRecentIds(prev => {
            if (prev[0] === selectedCategoryId) return prev;
            const filtered = prev.filter(id => id !== selectedCategoryId);
            const newRecent = [selectedCategoryId, ...filtered].slice(0, RECENT_LIMIT);
            storage.set(STORAGE_KEY, 'list', newRecent);
            return newRecent;
        });
    }, [selectedCategoryId]);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Recently Used
                </span>
                <button
                    onClick={onBrowseAll}
                    className="text-[10px] font-bold text-blue-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
                >
                    Browse all
                </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar scroll-smooth">
                {displayCategories.map((category) => {
                    if (!category) return null;
                    const IconComponent = (LucideIcons as any)[category.icon];
                    const isSelected = category.id === selectedCategoryId;

                    return (
                        <motion.button
                            key={category.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onSelect(category.id)}
                            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-full whitespace-nowrap transition-all border ${isSelected
                                ? 'bg-blue-500 border-blue-500 shadow-lg shadow-blue-100'
                                : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
                                }`}
                        >
                            <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center ${isSelected ? 'bg-white/20' : ''
                                    }`}
                                style={{
                                    backgroundColor: isSelected ? '' : `${category.color}15`,
                                }}
                            >
                                {IconComponent && (
                                    <IconComponent
                                        className="w-3 h-3"
                                        style={{ color: isSelected ? 'white' : category.color }}
                                    />
                                )}
                            </div>
                            <span
                                className={`text-[11px] font-bold ${isSelected ? 'text-white' : 'text-gray-700'
                                    }`}
                            >
                                {category.name}
                            </span>
                        </motion.button>
                    );
                })}

                {/* Browse All Chip */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={onBrowseAll}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-gray-50 border border-transparent hover:bg-gray-100 transition-colors shadow-sm"
                >
                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                        <MoreHorizontal className="w-3 h-3 text-gray-600" />
                    </div>
                    <span className="text-[11px] font-bold text-gray-600">More</span>
                </motion.button>
            </div>
        </div>
    );
}
