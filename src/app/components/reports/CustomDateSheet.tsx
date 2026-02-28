import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';

interface CustomDateSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (start: Date, end: Date) => void;
    initialStart?: Date;
    initialEnd?: Date;
}

export function CustomDateSheet({ isOpen, onClose, onApply, initialStart, initialEnd }: CustomDateSheetProps) {
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setStartDate(initialStart ? format(initialStart, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
            setEndDate(initialEnd ? format(initialEnd, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
        }
    }, [isOpen, initialStart, initialEnd]);

    const handleApply = () => {
        if (startDate && endDate) {
            const start = new Date(startDate + 'T00:00:00');
            const end = new Date(endDate + 'T23:59:59');
            // Ensure start is before end
            if (start <= end) {
                onApply(start, end);
                onClose();
            } else {
                onApply(end, start);
                onClose();
            }
        }
    };

    const applyPreset = (daysDiff: number, monthsDiff: number = 0) => {
        const end = new Date();
        let start = new Date();

        if (daysDiff > 0) {
            start = subDays(end, daysDiff);
        } else if (monthsDiff > 0) {
            start = subMonths(end, monthsDiff);
        }

        setStartDate(format(start, 'yyyy-MM-dd'));
        setEndDate(format(end, 'yyyy-MM-dd'));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-50 p-6 font-dm-sans shadow-2xl safe-area-bottom"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Custom Range</h2>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none -mx-6 px-6">
                            <button
                                onClick={() => applyPreset(7)}
                                className="flex-none px-4 py-2 bg-gray-100 rounded-full text-sm font-bold text-gray-700 active:bg-gray-200"
                            >
                                Last 7 days
                            </button>
                            <button
                                onClick={() => applyPreset(30)}
                                className="flex-none px-4 py-2 bg-gray-100 rounded-full text-sm font-bold text-gray-700 active:bg-gray-200"
                            >
                                Last 30 days
                            </button>
                            <button
                                onClick={() => applyPreset(0, 3)}
                                className="flex-none px-4 py-2 bg-gray-100 rounded-full text-sm font-bold text-gray-700 active:bg-gray-200"
                            >
                                Last 3 months
                            </button>
                        </div>

                        <div className="flex gap-4 mb-8">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    Start Date
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    End Date
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleApply}
                            disabled={!startDate || !endDate}
                            className="w-full h-[52px] bg-blue-600 text-white rounded-[16px] font-bold text-lg active:opacity-90 transition-opacity disabled:opacity-50 disabled:bg-gray-300"
                        >
                            Apply Range
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-4 text-sm font-bold text-gray-400 active:text-gray-600 mt-2"
                        >
                            Cancel
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
