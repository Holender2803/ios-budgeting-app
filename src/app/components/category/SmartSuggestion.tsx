import React from 'react';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useExpense } from '../../context/ExpenseContext';

interface SmartSuggestionProps {
    vendor: string;
    onSelect: (categoryId: string) => void;
    selectedCategoryId: string;
}

export function SmartSuggestion({ vendor, onSelect, selectedCategoryId }: SmartSuggestionProps) {
    const { categories, getSuggestedCategory } = useExpense();

    const suggestedCategoryId = getSuggestedCategory(vendor);
    const suggestion = suggestedCategoryId ? categories.find(c => c.id === suggestedCategoryId) : null;

    if (!suggestion) return null;

    const IconComponent = (LucideIcons as any)[suggestion.icon];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
            >
                <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100/50 p-2 pl-3 rounded-2xl">
                    <div className="flex items-center gap-3">
                        {/* Pulsing Dot */}
                        <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </div>

                        <div className="flex items-center gap-2">
                            <div
                                className="w-6 h-6 rounded-full flex items-center justify-center bg-white shadow-sm"
                                style={{ color: suggestion.color }}
                            >
                                {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                            </div>
                            <p className="text-xs text-blue-900 font-medium font-sans">
                                Suggested: <span className="font-bold">{suggestion.name}</span>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => onSelect(suggestion.id)}
                        disabled={suggestedCategoryId === selectedCategoryId}
                        className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95 ${suggestedCategoryId === selectedCategoryId
                            ? 'bg-blue-100 text-blue-500 cursor-default flex items-center gap-1.5'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                    >
                        {suggestedCategoryId === selectedCategoryId ? (
                            <>
                                <LucideIcons.Check className="w-3 h-3" />
                                Applied
                            </>
                        ) : (
                            'Apply'
                        )}
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
