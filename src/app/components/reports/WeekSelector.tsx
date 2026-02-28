import { useMemo, useEffect, useRef, useState } from 'react';
import { format, subWeeks, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface WeekRange {
    start: Date;
    end: Date;
    label: string;
}

interface WeekSelectorProps {
    selectedWeekStart: Date;
    onChange: (weekStart: Date) => void;
    weeksToShow?: number;
}

export function WeekSelector({ selectedWeekStart, onChange, weeksToShow = 52 }: WeekSelectorProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Generate the last N weeks
    const weeks = useMemo(() => {
        const today = new Date();
        const result: WeekRange[] = [];

        for (let i = 0; i < weeksToShow; i++) {
            const start = startOfWeek(subWeeks(today, i));
            const end = endOfWeek(start);

            let label = '';
            if (start.getMonth() === end.getMonth()) {
                label = `${format(start, 'MMM d')}–${format(end, 'd')}`;
            } else {
                label = `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
            }

            result.push({ start, end, label });
        }

        // Reverse to chronological order for scrolling (oldest left, newest right)
        return result.reverse();
    }, [weeksToShow]);

    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);

    // Scroll to the end (newest week) automatically on mount
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
            updateArrows();
        }
    }, [weeks]);

    const updateArrows = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setShowLeftArrow(scrollLeft > 0);
            setShowRightArrow(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
        }
    };

    const scrollBy = (offset: number) => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
        }
    };

    return (
        <div className="w-full mt-2 relative -mx-6 px-6">
            {/* Left Fade + Arrow */}
            <div className={`absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white via-white to-transparent z-10 flex items-center justify-start pl-2 transition-opacity duration-300 ${showLeftArrow ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button
                    onClick={() => scrollBy(-200)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-400 hover:text-gray-600 active:scale-95"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
            </div>

            <div
                ref={scrollRef}
                onScroll={updateArrows}
                className="flex gap-2 overflow-x-auto no-scrollbar py-2 pb-4 px-2"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {weeks.map((week, idx) => {
                    const isSelected = isSameDay(week.start, selectedWeekStart);

                    return (
                        <button
                            key={idx}
                            onClick={() => onChange(week.start)}
                            className={`flex-none px-4 py-2 rounded-full text-sm font-dm-sans transition-all whitespace-nowrap
                 ${isSelected
                                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-200'
                                    : 'bg-gray-50 text-gray-600 border border-gray-100 hover:border-gray-200 hover:bg-gray-100'
                                }`}
                        >
                            {week.label}
                        </button>
                    );
                })}
            </div>

            {/* Right Fade + Arrow */}
            <div className={`absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white via-white to-transparent z-10 flex items-center justify-end pr-2 transition-opacity duration-300 ${showRightArrow ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button
                    onClick={() => scrollBy(200)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-400 hover:text-gray-600 active:scale-95"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
