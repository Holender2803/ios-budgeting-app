import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X } from 'lucide-react';
import { useSelection } from '../context/SelectionContext';

interface BulkActionBarProps {
    onDelete: () => void;
}

export function BulkActionBar({ onDelete }: BulkActionBarProps) {
    const { isSelectionMode, selectedIds, toggleSelectionMode, clearSelection } = useSelection();

    const handleCancel = () => {
        clearSelection();
        toggleSelectionMode(false);
    };

    return (
        <AnimatePresence>
            {isSelectionMode && selectedIds.length > 0 && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
                >
                    <div className="max-w-lg mx-auto flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900">
                                {selectedIds.length} {selectedIds.length === 1 ? 'expense' : 'expenses'} selected
                            </span>
                            <button
                                onClick={handleCancel}
                                className="text-xs text-gray-500 font-medium hover:text-black flex items-center gap-1 mt-0.5"
                            >
                                <X className="w-3 h-3" />
                                Cancel
                            </button>
                        </div>

                        <button
                            onClick={onDelete}
                            className="px-6 py-3 bg-red-500 text-white rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 active:scale-95"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete ({selectedIds.length})
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
