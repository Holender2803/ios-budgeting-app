import { motion } from 'motion/react';

export type TimePeriod = 'Week' | 'Month' | '3 Months' | 'Custom';
export const PERIODS: TimePeriod[] = ['Week', 'Month', '3 Months', 'Custom'];

interface PeriodSelectorProps {
    value: TimePeriod;
    onChange: (period: TimePeriod) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
    return (
        <div className="flex bg-gray-100/80 p-1 rounded-xl w-full relative">
            {PERIODS.map(period => {
                const isActive = value === period;
                return (
                    <button
                        key={period}
                        onClick={() => onChange(period)}
                        className={`flex-1 py-2 text-xs font-dm-sans font-semibold rounded-[10px] transition-colors relative z-10 ${isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="periodIndicator"
                                className="absolute inset-0 bg-white rounded-[10px] shadow-sm"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                style={{ zIndex: -1 }}
                            />
                        )}
                        {period}
                    </button>
                );
            })}
        </div>
    );
}
