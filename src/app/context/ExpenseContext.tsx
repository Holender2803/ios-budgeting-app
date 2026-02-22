import React, { createContext, useContext, useState, useEffect } from 'react';
import { Transaction, Category, VendorRule, Settings, RecurringException } from '../types';
import { generateDemoData } from '../utils/generateDemoData';
import { addWeeks, addMonths, isBefore, isAfter, parseISO, format, addDays, startOfToday, endOfYear, addYears } from 'date-fns';
import { storage } from '../utils/storage';
import { toast } from 'sonner';

interface ExpenseContextType {
  transactions: Transaction[];
  categories: Category[];
  vendorRules: VendorRule[];
  settings: Settings;
  selectedCategoryIds: string[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  updateRecurringRule: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addVendorRule: (rule: Omit<VendorRule, 'id'>) => void;
  deleteVendorRule: (id: string) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  getCategoryById: (id: string) => Category | undefined;
  getTransactionsByDate: (date: string) => Transaction[];
  setSelectedCategories: (categoryIds: string[]) => void;
  getSuggestedCategory: (vendor: string) => string | null;
  saveFilterAsDefault: () => void;
  skipOccurrence: (ruleId: string, date: string, note?: string) => void;
  unskipOccurrence: (ruleId: string, date: string) => void;
  stopRecurringRule: (id: string) => void;
  recurringExceptions: RecurringException[];
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

const DEFAULT_CATEGORIES: Category[] = [
  // Essentials
  { id: '1', name: 'Rent / Housing', icon: 'Home', color: '#81B29A' },
  { id: '2', name: 'Groceries', icon: 'ShoppingCart', color: '#E76F51' },
  { id: '3', name: 'Transportation', icon: 'Car', color: '#E07A5F' },
  { id: '4', name: 'Utilities', icon: 'Zap', color: '#F4A261' },

  // Lifestyle
  { id: '5', name: 'Food & Dining', icon: 'UtensilsCrossed', color: '#E07A5F' },
  { id: '6', name: 'Coffee', icon: 'Coffee', color: '#A0826D' },
  { id: '7', name: 'Shopping', icon: 'ShoppingBag', color: '#3D9BE9' },
  { id: '8', name: 'Entertainment', icon: 'Film', color: '#F4A261' },

  // Financial / Structural
  { id: '9', name: 'Subscriptions', icon: 'Repeat', color: '#ADB5BD' },
  { id: '10', name: 'Bills', icon: 'Receipt', color: '#6C757D' },
  { id: '11', name: 'Fees & Charges', icon: 'AlertCircle', color: '#E76F51' },

  // Catch-all
  { id: '12', name: 'Other', icon: 'MoreHorizontal', color: '#ADB5BD' },
];

const DEFAULT_SETTINGS: Settings = {
  notifications: true,
  googleCalendarSync: false,
};

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [vendorRules, setVendorRules] = useState<VendorRule[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [recurringExceptions, setRecurringExceptions] = useState<RecurringException[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load data from IndexedDB (with localStorage migration) on mount
  useEffect(() => {
    async function loadData() {
      // 1. Try to load from IndexedDB
      let dbTransactions = await storage.getAll<Transaction>('transactions');
      let dbCategories = await storage.getAll<Category>('categories');
      let dbRules = await storage.getAll<VendorRule>('vendorRules');
      let dbSettings = await storage.get<Settings>('settings', 'app_settings');
      let dbExceptions = await storage.getAll<RecurringException>('recurringExceptions');

      // 2. One-time Migration logic
      const hasMigrated = localStorage.getItem('indexeddb_migrated');
      if (!hasMigrated) {
        const localTransactions = localStorage.getItem('transactions');
        const localCategories = localStorage.getItem('categories');
        const localRules = localStorage.getItem('vendorRules');
        const localSettings = localStorage.getItem('settings');
        const localExceptions = localStorage.getItem('recurringExceptions');

        if (localTransactions && dbTransactions.length === 0) {
          dbTransactions = JSON.parse(localTransactions);
          for (const t of dbTransactions) await storage.set('transactions', t.id, t);
        }
        if (localCategories && dbCategories.length === 0) {
          dbCategories = JSON.parse(localCategories);
          for (const c of dbCategories) await storage.set('categories', c.id, c);
        }
        if (localRules && dbRules.length === 0) {
          dbRules = JSON.parse(localRules);
          for (const r of dbRules) await storage.set('vendorRules', r.id, r);
        }
        if (localSettings && !dbSettings) {
          dbSettings = JSON.parse(localSettings);
          await storage.set('settings', 'app_settings', dbSettings);
        }
        if (localExceptions && dbExceptions.length === 0) {
          dbExceptions = JSON.parse(localExceptions);
          for (const e of dbExceptions) await storage.set('recurringExceptions', `${e.ruleId}-${e.date}`, e);
        }
        localStorage.setItem('indexeddb_migrated', 'true');
      }

      // 3. Hydrate state
      if (dbTransactions.length > 0) {
        setTransactions(dbTransactions);
      } else {
        const demoData = generateDemoData();
        setTransactions(demoData);
        for (const t of demoData) await storage.set('transactions', t.id, t);
      }

      if (dbCategories.length > 0) {
        // Still apply the "missing defaults" logic to dbCategories
        const missingDefaults = DEFAULT_CATEGORIES.filter(
          defCat => !dbCategories.some(userCat => userCat.name === defCat.name || userCat.id === defCat.id)
        );
        const merged = [...dbCategories, ...missingDefaults];
        // Deduplication safety
        const seenIds = new Set<string>();
        const deduplicated: Category[] = [];
        merged.forEach(cat => {
          if (seenIds.has(cat.id)) {
            deduplicated.push({ ...cat, id: `fix-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` });
          } else {
            seenIds.add(cat.id);
            deduplicated.push(cat);
          }
        });
        setCategories(deduplicated);
        for (const c of deduplicated) await storage.set('categories', c.id, c);
      } else {
        setCategories(DEFAULT_CATEGORIES);
        for (const c of DEFAULT_CATEGORIES) await storage.set('categories', c.id, c);
      }

      if (dbRules.length > 0) setVendorRules(dbRules);
      if (dbSettings) {
        setSettings(dbSettings);
        if (dbSettings.defaultCategoryFilter) {
          setSelectedCategoryIds(dbSettings.defaultCategoryFilter);
        }
      }
      if (dbExceptions.length > 0) setRecurringExceptions(dbExceptions);

      setIsHydrated(true);
    }

    loadData();
  }, []);

  // Sync state to IndexedDB whenever it changes
  // We use key-based storage for arrays to avoid massive single-key reads if needed later, 
  // but for now, we just overwrite the whole collection to match the sync nature of the app.
  useEffect(() => {
    if (!isHydrated) return;
    // Clear and rewrite (minimal implementation for now)
    const sync = async () => {
      // Transactions
      for (const t of transactions) await storage.set('transactions', t.id, t);
    };
    sync();
  }, [transactions, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    const sync = async () => {
      for (const c of categories) await storage.set('categories', c.id, c);
    };
    sync();
  }, [categories, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    const sync = async () => {
      for (const r of vendorRules) await storage.set('vendorRules', r.id, r);
    };
    sync();
  }, [vendorRules, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    storage.set('settings', 'app_settings', settings);
  }, [settings, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    const sync = async () => {
      for (const e of recurringExceptions) await storage.set('recurringExceptions', `${e.ruleId}-${e.date}`, e);
    };
    sync();
  }, [recurringExceptions, isHydrated]);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction = {
      ...transaction,
      id: Date.now().toString(),
      isActive: transaction.isRecurring ? true : undefined,
    };
    setTransactions((prev) => [...prev, newTransaction]);
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const addCategory = (category: Omit<Category, 'id'>) => {
    const newCategory = {
      ...category,
      id: Date.now().toString(),
    };
    setCategories((prev) => [...prev, newCategory]);
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const addVendorRule = (rule: Omit<VendorRule, 'id'>) => {
    const newRule = {
      ...rule,
      id: Date.now().toString(),
    };
    setVendorRules((prev) => [...prev, newRule]);
  };

  const deleteVendorRule = (id: string) => {
    setVendorRules((prev) => prev.filter((r) => r.id !== id));
  };

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const getCategoryById = (id: string) => {
    return categories.find((c) => c.id === id);
  };

  const getTransactionsByDate = (date: string) => {
    return transactions.filter((t) => t.date === date);
  };

  const setSelectedCategories = (categoryIds: string[]) => {
    setSelectedCategoryIds(categoryIds);
  };

  const getSuggestedCategory = (vendor: string) => {
    if (!vendor) return null;
    const vendorLower = vendor.toLowerCase();

    // Find all matching rules
    const matchingRules = vendorRules.filter((r) => vendorLower.includes(r.vendor.toLowerCase()));

    // If multiple matches, pick longest rule (most specific)
    if (matchingRules.length > 0) {
      matchingRules.sort((a, b) => b.vendor.length - a.vendor.length);
      return matchingRules[0].categoryId;
    }

    return null;
  };

  const updateRecurringRule = (id: string, updates: Partial<Transaction>) => {
    const original = transactions.find(t => t.id === id);
    if (!original || !original.isRecurring) {
      updateTransaction(id, updates);
      return;
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const yesterdayStr = format(addDays(new Date(), -1), 'yyyy-MM-dd');

    // If the rule started today or later, we can just update it safely
    if (!isAfter(parseISO(todayStr), parseISO(original.date))) {
      updateTransaction(id, updates);
      return;
    }

    // Otherwise, we split:
    // 1. End the old rule yesterday
    updateTransaction(id, { endedAt: yesterdayStr, isActive: false });

    // 2. Create a new rule starting today (or the new date if specified)
    const newRule: Omit<Transaction, 'id'> = {
      ...original,
      ...updates,
      date: updates.date || todayStr,
      isActive: true,
      endedAt: undefined, // Clear any inherited endedAt
    };
    addTransaction(newRule);

    toast.success('Rule updated (future only)');
  };

  const saveFilterAsDefault = () => {
    // Save the current selectedCategoryIds to settings
    setSettings((prev) => ({ ...prev, defaultCategoryFilter: selectedCategoryIds }));
  };

  const skipOccurrence = (ruleId: string, date: string, note?: string) => {
    setRecurringExceptions(prev => [
      ...prev.filter(e => !(e.ruleId === ruleId && e.date === date)),
      { ruleId, date, skipped: true, note }
    ]);
  };

  const unskipOccurrence = (ruleId: string, date: string) => {
    setRecurringExceptions(prev => prev.filter(e => !(e.ruleId === ruleId && e.date === date)));
  };

  const stopRecurringRule = (id: string) => {
    const now = format(new Date(), 'yyyy-MM-dd');
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    // If it's starting today or in the future, we can just delete/inactivate it entirely.
    // If it started in the past, we end it "yesterday" or "today" depending on whether 
    // we want today's instance to count. Let's end it "yesterday" so today is the first "removed" day if they stop it today.
    const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd');

    // If the rule started today or later, just deactivate it.
    if (!isAfter(parseISO(now), parseISO(transaction.date))) {
      updateTransaction(id, { isActive: false });
    } else {
      updateTransaction(id, { endedAt: yesterday, isActive: false });
    }
  };

  // Helper to expand recurring transactions into virtual occurrences
  const expandTransactions = (baseTransactions: Transaction[]): Transaction[] => {
    const expanded: Transaction[] = [];
    const horizon = endOfYear(addYears(startOfToday(), 1)); // Generate for current and next year

    baseTransactions.forEach((t) => {
      // Always add the base transaction itself if it's not "permanently deleted" by endedAt check
      // OR if it's a normal non-recurring one
      expanded.push(t);

      if (t.isRecurring && t.recurrenceType && t.isActive !== false) {
        let currentDate = parseISO(t.date);
        const cutoffDateStr = t.endedAt || format(horizon, 'yyyy-MM-dd');
        const cutoffDate = parseISO(cutoffDateStr);

        const endDate = t.endDate ? parseISO(t.endDate) : horizon;
        const limit = isBefore(endDate, cutoffDate) ? endDate : cutoffDate;

        // Generate subsequent occurrences
        let nextDate = t.recurrenceType === 'weekly'
          ? addWeeks(currentDate, 1)
          : addMonths(currentDate, 1);

        while (!isAfter(nextDate, limit)) {
          const dateStr = format(nextDate, 'yyyy-MM-dd');

          // Check for skip exception
          const exception = recurringExceptions.find(e => e.ruleId === t.id && e.date === dateStr);

          expanded.push({
            ...t,
            id: `${t.id}-${dateStr}`, // Deterministic virtual ID
            date: dateStr,
            isVirtual: true,
            isSkipped: exception?.skipped || false,
            skipNote: exception?.note,
          } as Transaction & { isVirtual?: boolean; isSkipped?: boolean; skipNote?: string });

          nextDate = t.recurrenceType === 'weekly'
            ? addWeeks(nextDate, 1)
            : addMonths(nextDate, 1);
        }
      }
    });

    return expanded;
  };

  // Dynamically apply vendor rules AND expand recurring transactions
  const processedTransactions = (() => {
    // 1. Apply vendor rules first
    const withRules = transactions.map((t) => {
      const suggestedCategory = getSuggestedCategory(t.vendor);
      if (suggestedCategory) {
        return { ...t, category: suggestedCategory };
      }
      return t;
    });

    // 2. Expand recurring
    return expandTransactions(withRules);
  })();

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    );
  }

  return (
    <ExpenseContext.Provider
      value={{
        transactions: processedTransactions,
        categories,
        vendorRules,
        settings,
        selectedCategoryIds,
        addTransaction,
        updateTransaction,
        updateRecurringRule,
        deleteTransaction,
        addCategory,
        updateCategory,
        deleteCategory,
        addVendorRule,
        deleteVendorRule,
        updateSettings,
        getCategoryById,
        getTransactionsByDate,
        setSelectedCategories,
        getSuggestedCategory,
        saveFilterAsDefault,
        skipOccurrence,
        unskipOccurrence,
        stopRecurringRule,
        recurringExceptions,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpense() {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpense must be used within ExpenseProvider');
  }
  return context;
}