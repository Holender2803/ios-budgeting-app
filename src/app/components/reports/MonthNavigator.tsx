import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, isSameMonth } from 'date-fns';

interface MonthNavigatorProps {
    currentMonth: Date;
    onChange: (date: Date) => void;
}

export function MonthNavigator({ currentMonth, onChange }: MonthNavigatorProps) {
    const isCurrentMonth = isSameMonth(currentMonth, new Date());

    const handlePrev = () => {
        onChange(startOfMonth(subMonths(currentMonth, 1)));
    };

    const handleNext = () => {
        if (!isCurrentMonth) {
            onChange(startOfMonth(addMonths(currentMonth, 1)));
        }
    };

    return (
        <div className="flex items-center justify-between w-full mt-4 bg-gray-100/50 rounded-2xl p-1 mb-2">
            <button
                onClick={handlePrev}
                className="w-10 h-10 flex items-center justify-center rounded-[14px] text-gray-400 hover:text-gray-600 hover:bg-white transition-colors active:scale-95"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-[13px] font-bold text-gray-900 tracking-wide uppercase font-dm-sans">
                {format(currentMonth, 'MMMM yyyy')}
            </span>

            <button
                onClick={handleNext}
                disabled={isCurrentMonth}
                className={`w-10 h-10 flex items-center justify-center rounded-[14px] transition-colors ${isCurrentMonth
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-white active:scale-95'
                    }`}
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
}
