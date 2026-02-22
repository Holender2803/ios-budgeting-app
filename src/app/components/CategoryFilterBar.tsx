import { useState } from 'react';
import { useExpense } from '../context/ExpenseContext';
import * as LucideIcons from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';

export function CategoryFilterBar() {
  const { categories, selectedCategoryIds, setSelectedCategories, saveFilterAsDefault } = useExpense();
  const [isOpen, setIsOpen] = useState(false);

  const toggleCategory = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      setSelectedCategories(selectedCategoryIds.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategoryIds, categoryId]);
    }
  };

  const selectAll = () => {
    setSelectedCategories([]);
  };

  const handleSaveDefault = () => {
    saveFilterAsDefault();
    toast.success('Filter saved as default');
  };

  const isAllSelected = selectedCategoryIds.length === 0;

  const filterLabel = isAllSelected
    ? 'All categories'
    : selectedCategoryIds.length === 1
      ? categories.find(c => c.id === selectedCategoryIds[0])?.name || 'Filter active'
      : `${selectedCategoryIds.length} categories`;

  const IconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="w-4 h-4" /> : null;
  };

  return (
    <>
      {/* Compact Filter Control */}
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between py-2 px-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
        >
          <span className="text-sm text-gray-600">
            Filter: <span className="text-gray-900 font-medium">{filterLabel}</span>
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Filter Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] flex flex-col pb-8">
          <SheetHeader className="pb-2 flex-shrink-0">
            <SheetTitle className="text-lg">Filter Categories</SheetTitle>
            <SheetDescription className="text-sm text-gray-500 font-normal pt-1">
              Show only selected categories
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-0.5 overflow-y-auto flex-1 min-h-0 relative">
            {/* All Categories Option */}
            <button
              onClick={() => {
                selectAll();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-colors ${isAllSelected ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isAllSelected ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
                }`}>
                {isAllSelected && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="font-medium text-gray-900">All Categories</span>
            </button>

            {/* Subtle visual separator */}
            <div className="h-2" />

            {/* Individual Categories */}
            {categories.map((category) => {
              const isSelected = selectedCategoryIds.includes(category.id);

              return (
                <button
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'border-transparent' : 'border-gray-300'
                    }`} style={isSelected ? { backgroundColor: category.color } : {}}>
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="opacity-60" style={{ color: category.color }}>
                    {IconComponent(category.icon)}
                  </span>
                  <span className="text-gray-900">{category.name}</span>
                </button>
              );
            })}
          </div>

          {/* Save as Default */}
          {!isAllSelected && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={handleSaveDefault}
                className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700 py-2"
              >
                Save as default filter
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}