import { useState, useMemo, useEffect } from 'react';
import { useExpense, CANONICAL_GROUPS } from '../context/ExpenseContext';
import { Transaction, Category } from '../types';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, Check } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from './ui/sheet';

interface CategoryFilterBarProps {
  transactions: Transaction[];
}

export function CategoryFilterBar({ transactions }: CategoryFilterBarProps) {
  const { categories, selectedCategoryIds, setSelectedCategories } = useExpense();
  const [isOpen, setIsOpen] = useState(false);

  // Local state for the filter before applying
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedCategoryIds);

  // Keep local state in sync when external selected ids change (e.g. initial load or reset)
  useEffect(() => {
    setLocalSelectedIds(selectedCategoryIds);
  }, [selectedCategoryIds, isOpen]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, [transactions]);

  const groupedCategories = useMemo(() => {
    const groups: Record<string, Category[]> = {};
    CANONICAL_GROUPS.forEach(g => groups[g] = []);

    categories.forEach(cat => {
      const g = cat.group || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(cat);
    });

    return groups;
  }, [categories]);

  const toggleCategory = (categoryId: string) => {
    setLocalSelectedIds(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleApply = () => {
    setSelectedCategories(localSelectedIds);
    setIsOpen(false);
  };

  const handleClearAll = () => {
    setLocalSelectedIds([]);
  };

  const handleSelectAll = () => {
    if (localSelectedIds.length === categories.length) {
      setLocalSelectedIds([]);
    } else {
      setLocalSelectedIds(categories.map(c => c.id));
    }
  };

  const isAllLocalSelected = localSelectedIds.length === categories.length;

  const filterLabel = selectedCategoryIds.length === 0 || selectedCategoryIds.length === categories.length
    ? 'All categories'
    : selectedCategoryIds.length === 1
      ? categories.find(c => c.id === selectedCategoryIds[0])?.name || 'Filter active'
      : `${selectedCategoryIds.length} categories`;

  const IconComponent = ({ iconName, color }: { iconName: string, color: string }) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="w-3.5 h-3.5" style={{ color }} /> : null;
  };

  return (
    <>
      {/* Compact Filter Control */}
      <div className="bg-gray-50/50 px-5 py-4 border-t border-gray-100">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between py-2 px-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-all shadow-sm"
        >
          <span className="text-[13px] text-gray-500">
            Filter: <span className="text-gray-900 font-semibold">{filterLabel}</span>
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="max-h-[88vh] flex flex-col p-0 rounded-t-[32px] overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <div className="flex items-center justify-between mb-1">
              <SheetTitle className="text-xl font-bold">Filter Categories</SheetTitle>
            </div>
            <p className="text-[13px] text-gray-500">Tap to show only selected</p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-32">
            {/* Header Action Row */}
            <div className="flex items-center justify-between py-3 border-b border-gray-50 mb-2">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-3 py-1"
              >
                <div className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition-all ${isAllLocalSelected ? 'bg-blue-600 border-blue-600' : 'border-2 border-gray-200'
                  }`}>
                  {isAllLocalSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </div>
                <span className="text-sm font-semibold text-gray-900">All Categories</span>
              </button>

              <button
                onClick={handleClearAll}
                className="text-xs font-bold text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                type="button"
              >
                Clear all
              </button>
            </div>

            {/* List with Groups */}
            <div className="space-y-6">
              {Object.entries(groupedCategories).map(([group, groupCats]) => {
                const catsWithExpenses = groupCats.filter(cat => (categoryCounts[cat.id] || 0) > 0);

                return catsWithExpenses.length > 0 && (
                  <div key={group}>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 pl-1">
                      {group}
                    </h3>
                    <div className="space-y-1">
                      {catsWithExpenses.map((cat) => {
                        const isSelected = localSelectedIds.includes(cat.id);
                        const count = categoryCounts[cat.id] || 0;

                        return (
                          <button
                            key={cat.id}
                            onClick={() => toggleCategory(cat.id)}
                            className="w-full flex items-center justify-between py-2.5 px-1 rounded-xl transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-2 border-gray-200'
                                }`}>
                                {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                              </div>

                              <div
                                className="w-7 h-7 rounded-[9px] flex items-center justify-center"
                                style={{ backgroundColor: `${cat.color}15` }}
                              >
                                <IconComponent iconName={cat.icon} color={cat.color} />
                              </div>

                              <span className={`text-[13px] font-medium transition-colors ${isSelected ? 'text-gray-900' : 'text-gray-400'}`}>
                                {cat.name}
                              </span>
                            </div>

                            <div className={`px-2 py-0.5 bg-gray-100 rounded-md transition-opacity ${isSelected ? 'opacity-100' : 'opacity-40'}`}>
                              <span className="text-[10px] font-mono font-bold text-gray-500">{count}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="h-px bg-gray-50 mt-4 mx-1" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Bottom Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 safe-area-bottom">
            <button
              onClick={handleApply}
              className="w-full h-14 bg-blue-600 text-white rounded-2xl text-[15px] font-bold shadow-lg shadow-blue-200 active:scale-[0.98] transition-all"
            >
              Apply Filter
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}