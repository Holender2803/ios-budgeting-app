import React, { useState } from 'react';
import { SmartSuggestion } from './SmartSuggestion';
import { RecentCategories } from './RecentCategories';
import { FullCategoryPicker } from './FullCategoryPicker';
import { useExpense } from '../../context/ExpenseContext';
import * as LucideIcons from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface CategoryPickerProps {
    selectedCategoryId: string;
    onSelect: (categoryId: string, source?: 'manual' | 'suggestion') => void;
    vendor: string;
}

export function CategoryPicker({
    selectedCategoryId,
    onSelect,
    vendor,
}: CategoryPickerProps) {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const { categories } = useExpense();

    const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
    const IconComponent = selectedCategory ? (LucideIcons as any)[selectedCategory.icon] : null;

    return (
        <div className="space-y-4">
            {/* Tier 1: Smart Suggestion */}
            <SmartSuggestion
                vendor={vendor}
                onSelect={(id) => onSelect(id, 'suggestion')}
                selectedCategoryId={selectedCategoryId}
            />

            {/* Tier 2 & 3: Recents and Full Picker */}
            <div className="space-y-3">
                <RecentCategories
                    vendor={vendor}
                    selectedCategoryId={selectedCategoryId}
                    onSelect={(id) => onSelect(id, 'manual')}
                    onBrowseAll={() => setIsPickerOpen(true)}
                />
            </div>

            <FullCategoryPicker
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                selectedCategoryId={selectedCategoryId}
                onSelect={(id) => onSelect(id, 'manual')}
            />
        </div>
    );
}
