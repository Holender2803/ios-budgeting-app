import React, { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useExpense } from '../../context/ExpenseContext';
import { Category } from '../../types';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface FullCategoryPickerProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCategoryId: string;
    onSelect: (categoryId: string) => void;
}

export function FullCategoryPicker({
    isOpen,
    onClose,
    selectedCategoryId,
    onSelect,
}: FullCategoryPickerProps) {
    const { categories, addCategory } = useExpense();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newName, setNewName] = useState('');

    const filteredCategories = useMemo(() => {
        if (!searchQuery) return categories;
        return categories.filter((c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [categories, searchQuery]);

    const groupedCategories = useMemo(() => {
        const groups: Record<string, Category[]> = {};
        filteredCategories.forEach((cat) => {
            const group = cat.group || 'Other';
            if (!groups[group]) groups[group] = [];
            groups[group].push(cat);
        });
        return groups;
    }, [filteredCategories]);

    const handleSelect = (categoryId: string) => {
        onSelect(categoryId);
        setTimeout(onClose, 200);
    };

    const [newGroup, setNewGroup] = useState('Everyday');

    const groups = ['Everyday', 'Home & Life', 'Getting Around', 'Health & Growth', 'Money Matters', 'Giving'];

    const handleAddNew = () => {
        if (!newName.trim()) return;
        addCategory({
            name: newName.trim(),
            icon: 'Tag',
            color: '#3B82F6',
            group: newGroup
        });
        setNewName('');
        setNewGroup('Everyday');
        setIsAddingNew(false);
    };

    const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
        if (!highlight) return <>{text}</>;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <span key={i} className="text-blue-500 font-bold">
                            {part}
                        </span>
                    ) : (
                        part
                    )
                )}
            </>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <h2 className="text-xl font-bold text-gray-900">Choose Category</h2>
                            <button
                                onClick={onClose}
                                className="text-sm font-bold text-blue-500 uppercase tracking-wider"
                            >
                                Done
                            </button>
                        </div>

                        {/* Search */}
                        <div className="px-6 py-4 bg-gray-50/50">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search categories..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-12 pl-11 pr-10 bg-white border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <X className="w-4 h-4 text-gray-400" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Categories Grid */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="space-y-6">
                                {Object.entries(groupedCategories).map(([group, groupCategories]) => (
                                    <div key={group} className="space-y-3">
                                        <h3 className="px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {group}
                                        </h3>
                                        <div className="grid grid-cols-4 gap-2">
                                            {groupCategories.map((category) => {
                                                const IconComponent = (LucideIcons as any)[category.icon];
                                                const isSelected = category.id === selectedCategoryId;

                                                return (
                                                    <motion.button
                                                        key={category.id}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleSelect(category.id)}
                                                        className={`flex flex-col items-center gap-2 p-2 rounded-2xl transition-all ${isSelected
                                                            ? 'bg-blue-50/80 ring-1 ring-blue-500/20'
                                                            : 'hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <div
                                                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 shadow-lg shadow-blue-200' : 'bg-gray-50 shadow-sm'
                                                                }`}
                                                        >
                                                            {IconComponent && (
                                                                <IconComponent
                                                                    className={`w-6 h-6 transition-colors ${isSelected ? 'text-white' : ''
                                                                        }`}
                                                                    style={{ color: isSelected ? undefined : category.color }}
                                                                />
                                                            )}
                                                        </div>
                                                        <span
                                                            className={`text-[10px] font-bold text-center leading-tight line-clamp-2 ${isSelected ? 'text-blue-600' : 'text-gray-600'
                                                                }`}
                                                        >
                                                            {searchQuery ? (
                                                                <HighlightText text={category.name} highlight={searchQuery} />
                                                            ) : (
                                                                category.name
                                                            )}
                                                        </span>
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {Object.keys(groupedCategories).length === 0 && (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 font-medium">No categories found</p>
                                        <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                                    </div>
                                )}

                                {/* Add New Category CTA */}
                                <div className="pt-4 mt-4 border-t border-gray-100 pb-8">
                                    {isAddingNew ? (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-4 bg-gray-50 rounded-2xl space-y-4"
                                        >
                                            <div className="space-y-2">
                                                <Label htmlFor="new-cat" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category Name</Label>
                                                <Input
                                                    id="new-cat"
                                                    value={newName}
                                                    onChange={(e) => setNewName(e.target.value)}
                                                    placeholder="e.g. Shopping"
                                                    className="h-12 bg-white rounded-xl border-gray-200"
                                                    autoFocus
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pick Group</Label>
                                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                                    {groups.map(g => (
                                                        <button
                                                            key={g}
                                                            onClick={() => setNewGroup(g)}
                                                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${newGroup === g
                                                                ? 'bg-blue-500 text-white shadow-sm'
                                                                : 'bg-white text-gray-500 border border-gray-100'
                                                                }`}
                                                        >
                                                            {g}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    onClick={() => setIsAddingNew(false)}
                                                    className="flex-1 h-12 text-xs font-bold text-gray-400 uppercase"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleAddNew}
                                                    disabled={!newName.trim()}
                                                    className="flex-1 h-12 bg-blue-500 text-white rounded-xl text-xs font-bold uppercase disabled:bg-gray-300 shadow-lg shadow-blue-100"
                                                >
                                                    Add Category
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <button
                                            onClick={() => setIsAddingNew(true)}
                                            className="w-full py-4 flex flex-col items-center gap-1 group"
                                        >
                                            <p className="text-xs font-medium text-gray-400 group-hover:text-gray-600 transition-colors">Didn't find what you need?</p>
                                            <div className="flex items-center gap-2 text-sm font-bold text-blue-500 group-hover:text-blue-600 transition-colors">
                                                <Plus className="w-4 h-4" />
                                                Add new category
                                            </div>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
