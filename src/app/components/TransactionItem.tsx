import { motion } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import { Transaction } from '../types';
import { useExpense } from '../context/ExpenseContext';
import { Repeat } from 'lucide-react';

interface TransactionItemProps {
  transaction: Transaction;
  onClick: () => void;
}

export function TransactionItem({ transaction, onClick }: TransactionItemProps) {
  const { getCategoryById, skipOccurrence, unskipOccurrence } = useExpense();
  const category = getCategoryById(transaction.category);

  const IconComponent = category ? (LucideIcons as any)[category.icon] : null;

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-all ${transaction.isSkipped ? 'opacity-40 grayscale-[0.5]' : ''
        }`}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: category ? `${category.color}15` : '#f3f4f6' }}
      >
        {IconComponent && (
          <IconComponent className="w-5 h-5" style={{ color: category?.color }} />
        )}
      </div>

      <div className="flex-1 text-left min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">{transaction.vendor}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {category && (
            <p className="text-xs text-gray-500">{category.name}</p>
          )}
          {transaction.isRecurring && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${transaction.isSkipped
              ? 'bg-red-50 text-red-500 border-red-100'
              : 'bg-gray-50 text-gray-400 border-gray-100'
              }`}>
              <LucideIcons.Repeat className="w-2.5 h-2.5" />
              {transaction.isSkipped ? 'Skipped' : 'Recurring'}
            </span>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
        <p className={`font-semibold text-gray-900 text-base ${transaction.isSkipped ? 'line-through text-gray-400' : ''
          }`}>
          ${transaction.amount.toFixed(2)}
        </p>

        {transaction.isVirtual && (
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
            className={`text-[9px] font-bold uppercase tracking-tighter transition-colors ${transaction.isSkipped ? 'text-gray-500 hover:text-black' : 'text-blue-500 hover:text-red-500'
              }`}
          >
            {transaction.isSkipped ? 'Unskip' : 'Skip'}
          </button>
        )}
      </div>
    </motion.button>
  );
}