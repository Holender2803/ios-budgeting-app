import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface SelectionContextType {
    isSelectionMode: boolean;
    selectedIds: string[];
    toggleSelectionMode: (active?: boolean) => void;
    selectItem: (id: string) => void;
    deselectItem: (id: string) => void;
    toggleSelection: (id: string) => void;
    clearSelection: () => void;
    selectAll: (ids: string[]) => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const toggleSelectionMode = useCallback((active?: boolean) => {
        setIsSelectionMode((prev) => {
            const nextMode = active !== undefined ? active : !prev;
            if (!nextMode) {
                setSelectedIds([]); // Clear selection when exiting mode
            }
            return nextMode;
        });
    }, []);

    const selectItem = useCallback((id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }, []);

    const deselectItem = useCallback((id: string) => {
        setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    }, []);

    const toggleSelection = useCallback((id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
        );
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedIds([]);
    }, []);

    const selectAll = useCallback((ids: string[]) => {
        setSelectedIds((prev) => {
            const newSelections = ids.filter(id => !prev.includes(id));
            return [...prev, ...newSelections];
        });
    }, []);

    const value = useMemo(
        () => ({
            isSelectionMode,
            selectedIds,
            toggleSelectionMode,
            selectItem,
            deselectItem,
            toggleSelection,
            clearSelection,
            selectAll,
        }),
        [isSelectionMode, selectedIds, toggleSelectionMode, selectItem, deselectItem, toggleSelection, clearSelection, selectAll]
    );

    return (
        <SelectionContext.Provider value={value}>
            {children}
        </SelectionContext.Provider>
    );
}

export function useSelection() {
    const context = useContext(SelectionContext);
    if (context === undefined) {
        throw new Error('useSelection must be used within a SelectionProvider');
    }
    return context;
}
