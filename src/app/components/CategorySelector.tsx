import * as LucideIcons from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { motion } from 'motion/react';

interface CategorySelectorProps {
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
}

export function CategorySelector({ selectedCategoryId, onSelect }: CategorySelectorProps) {
  const { categories } = useExpense();

  return (
    <div className="grid grid-cols-4 gap-3">
      {categories.map((category) => {
        const IconComponent = (LucideIcons as any)[category.icon];
        const isSelected = category.id === selectedCategoryId;

        return (
          <motion.button
            key={category.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(category.id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
              isSelected
                ? 'bg-blue-500 shadow-lg'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isSelected ? 'bg-white/20' : ''
              }`}
              style={{
                backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${category.color}15`,
              }}
            >
              {IconComponent && (
                <IconComponent
                  className="w-6 h-6"
                  style={{ color: isSelected ? 'white' : category.color }}
                />
              )}
            </div>
            <span className={`text-xs text-center ${isSelected ? 'text-white font-medium' : 'text-gray-700'}`}>
              {category.name}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
