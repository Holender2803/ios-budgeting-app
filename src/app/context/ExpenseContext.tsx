import React, { createContext, useContext, useState, useEffect } from 'react';
import { Transaction, Category, VendorRule, Settings } from '../types';
import { generateDemoData } from '../utils/generateDemoData';

interface ExpenseContextType {
  transactions: Transaction[];
  categories: Category[];
  vendorRules: VendorRule[];
  settings: Settings;
  selectedCategoryIds: string[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
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

  // Load data from localStorage on mount
  useEffect(() => {
    const savedTransactions = localStorage.getItem('transactions');
    const savedCategories = localStorage.getItem('categories');
    const savedVendorRules = localStorage.getItem('vendorRules');
    const savedSettings = localStorage.getItem('settings');

    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    } else {
      // First time user - load demo data
      const demoData = generateDemoData();
      setTransactions(demoData);
    }

    if (savedCategories) {
      const parsedCategories = JSON.parse(savedCategories) as Category[];

      // Merge in any newly defined defaults that the user is missing (i.e. returning user from v1)
      const missingDefaults = DEFAULT_CATEGORIES.filter(
        defCat => !parsedCategories.some(userCat => userCat.name === defCat.name)
      );

      const mergedCategories = [...parsedCategories, ...missingDefaults];
      setCategories(mergedCategories);

      // If we backfilled, immediately save so they aren't computed on every mount
      if (missingDefaults.length > 0) {
        localStorage.setItem('categories', JSON.stringify(mergedCategories));
      }
    }
    if (savedVendorRules) setVendorRules(JSON.parse(savedVendorRules));
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);
      // Load default category filter if it exists
      if (parsedSettings.defaultCategoryFilter) {
        setSelectedCategoryIds(parsedSettings.defaultCategoryFilter);
      }
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('vendorRules', JSON.stringify(vendorRules));
  }, [vendorRules]);

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction = {
      ...transaction,
      id: Date.now().toString(),
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

  const saveFilterAsDefault = () => {
    // Save the current selectedCategoryIds to settings
    setSettings((prev) => ({ ...prev, defaultCategoryFilter: selectedCategoryIds }));
  };

  // Dynamically apply vendor rules to the context's transactions
  const mappedTransactions = transactions.map((t) => {
    const suggestedCategory = getSuggestedCategory(t.vendor);
    if (suggestedCategory) {
      return { ...t, category: suggestedCategory };
    }
    return t;
  });

  return (
    <ExpenseContext.Provider
      value={{
        transactions: mappedTransactions,
        categories,
        vendorRules,
        settings,
        selectedCategoryIds,
        addTransaction,
        updateTransaction,
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