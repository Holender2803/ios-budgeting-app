import { motion } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import { Transaction } from '../types';
import { useExpense } from '../context/ExpenseContext';
import { useSelection } from '../context/SelectionContext';
import { CheckCircle2, Circle } from 'lucide-react';

interface TransactionItemProps {
  transaction: Transaction;
  onClick: () => void;
}

export function TransactionItem({ transaction, onClick }: TransactionItemProps) {
  const { getCategoryById, skipOccurrence, unskipOccurrence } = useExpense();
  const { isSelectionMode, selectedIds, toggleSelection } = useSelection();
  const category = getCategoryById(transaction.category);

  const isSelected = selectedIds.includes(transaction.id);
  const IconComponent = category ? (LucideIcons as any)[category.icon] : null;

  const handleContainerClick = () => {
    if (isSelectionMode) {
      toggleSelection(transaction.id);
    } else {
      onClick();
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={handleContainerClick}
      className={`w-full bg-white rounded-2xl px-4 py-4 flex items-center gap-4 transition-all border-2 ${isSelectionMode && isSelected
        ? 'border-blue-500 bg-blue-50/30'
        : 'border-transparent shadow-sm hover:shadow-md'
        } ${transaction.isSkipped ? 'opacity-40 grayscale-[0.5]' : ''
        }`}
    >
      {/* Checkbox for selection mode */}
      {isSelectionMode && (
        <div className="flex-shrink-0">
          {isSelected ? (
            <CheckCircle2 className="w-6 h-6 text-blue-500 fill-blue-500/10" />
          ) : (
            <Circle className="w-6 h-6 text-gray-300" />
          )}
        </div>
      )}

      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: category ? `${category.color}15` : '#f3f4f6' }}
      >
        {IconComponent && (
          <IconComponent className="w-6 h-6" style={{ color: category?.color }} />
        )}
      </div>

      <div className="flex-1 text-left min-w-0">
        <p className="font-semibold text-gray-900 text-[15px] truncate">{transaction.vendor}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {category && (
            <p className="text-xs text-gray-500 font-medium">{category.name}</p>
          )}
          {transaction.isRecurring && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${transaction.isSkipped
              ? 'bg-red-50 text-red-500 border border-red-100'
              : 'bg-gray-100 text-gray-400'
              }`}>
              <LucideIcons.Repeat className="w-2.5 h-2.5" />
              {transaction.isSkipped ? 'Skipped' : 'Recurring'}
            </span>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
        <p className={`font-bold text-gray-900 text-base tabular-nums ${transaction.isSkipped ? 'line-through text-gray-400' : ''
          }`}>
          ${transaction.amount.toFixed(2)}
        </p>

        {transaction.isVirtual && !isSelectionMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const ruleId = transaction.id.split('-')[0];
              if (transaction.isSkipped) {
                unskipOccurrence(ruleId, transaction.date);
              } else {
                skipOccurrence(ruleId, transaction.date);
              }
            }}
            className={`text-[10px] font-bold uppercase tracking-tight transition-colors px-2 py-0.5 rounded ${transaction.isSkipped ? 'text-gray-500 hover:text-black hover:bg-gray-100' : 'text-blue-500 hover:text-red-500 hover:bg-red-50'
              }`}
          >
            {transaction.isSkipped ? 'Unskip' : 'Skip'}
          </button>
        )}
      </div>
    </motion.button>
  );
}