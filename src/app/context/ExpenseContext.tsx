import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Transaction, Category, VendorRule, Settings, RecurringException } from '../types';
import { generateDemoData } from '../utils/generateDemoData';
import { format, addDays, startOfToday, endOfYear, addYears, isBefore, isAfter, parseISO, addWeeks, addMonths } from 'date-fns';
import { storage } from '../utils/storage';
import { toast } from 'sonner';
import { ensureUUIDs } from '../utils/uuidMigration';
import { SyncService } from '../../lib/syncService';
import { useAuth } from './AuthContext';
import { LocalTransaction } from '../../lib/calendarService';
import { ParsedSpreadsheetImport, SpreadsheetImportSummary } from '../utils/spreadsheetImport';
import { SYSTEM_CATEGORIES, isSystemCategoryId } from '../constants/systemCategories';
import { findBestVendorCategoryMatch, PREMADE_VENDOR_RULES } from '../constants/vendorIntelligence';
import { ensureSystemCategories } from '../../lib/systemCategorySync';

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
  addVendorRule: (rule: Omit<VendorRule, 'id' | 'source' | 'createdAt'>) => void;
  deleteVendorRule: (id: string) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  bulkDeleteTransactions: (ids: string[], recurringOption?: 'single' | 'future' | 'all') => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  getTransactionsByDate: (date: string) => Transaction[];
  setSelectedCategories: (categoryIds: string[]) => void;
  getSuggestedCategory: (vendor: string) => string | null;
  saveFilterAsDefault: () => void;
  skipOccurrence: (ruleId: string, date: string, note?: string) => void;
  unskipOccurrence: (ruleId: string, date: string) => void;
  stopRecurringRule: (id: string) => void;
  recurringExceptions: RecurringException[];
  includeRecurring: boolean;
  setIncludeRecurring: (value: boolean) => void;
  filteredTransactions: Transaction[];
  exportBackup: () => void;
  importBackup: (jsonString: string) => Promise<void>;
  importSpreadsheet: (
    data: ParsedSpreadsheetImport,
    onProgress?: (message: string, percent: number) => void,
  ) => Promise<SpreadsheetImportSummary>;
  clearAllData: () => Promise<void>;
  isHydrated: boolean;
  syncData: () => Promise<void>;
  isSyncing: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  buildCalendarPayload: () => LocalTransaction[];
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

const DEFAULT_CATEGORIES: Category[] = SYSTEM_CATEGORIES.map((category) => ({ ...category }));

export const CANONICAL_GROUPS = [
  'Everyday',
  'Home & Life',
  'Getting Around',
  'Health & Growth',
  'Money Matters',
  'Giving',
  'Other'
] as const;

export type CanonicalGroup = typeof CANONICAL_GROUPS[number];

// --- Helpers & Migration ---

export const normalizeLabel = (label: string) => {
  return label.trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')      // collapse spaces
    .replace(/[^\w\s&]/g, ''); // basic punctuation removal (keep &)
};

export const getCategoryError = (name: string, categories: Category[], id?: string) => {
  const label = normalizeLabel(name);
  if (!label) return 'Category name is required';
  const isDuplicate = categories.some(c => normalizeLabel(c.name) === label && c.id !== id);
  if (isDuplicate) return 'This category already exists';
  return null;
};

export const suggestCategoryForVendor = (
  vendorName: string,
  userRules: VendorRule[],
  _defaultRules: typeof PREMADE_VENDOR_RULES = PREMADE_VENDOR_RULES,
): { categoryId: string | null; matchedRule?: { vendor: string } } => {
  if (!vendorName) return { categoryId: null };

  const { categoryId, matchedVendor } = findBestVendorCategoryMatch(vendorName, userRules);
  if (!categoryId) {
    return { categoryId: null };
  }

  return {
    categoryId,
    matchedRule: matchedVendor ? { vendor: matchedVendor } : undefined,
  };
};

const LEGACY_MAPPING: Record<string, string> = {
  'coffee': 'cat-coffee',
  'transportation': 'cat-transport',
  'fees & charges': 'cat-bank', // or cat-taxes
  'bills': 'cat-util',
  'other': 'cat-uncategorized',
  'childcare': 'cat-uncategorized',
  'savings': 'cat-bank',
  'donations': 'cat-gifts',
};

const migrateData = (
  categories: Category[],
  transactions: Transaction[],
  vendorRules: VendorRule[]
) => {
  let changed = false;
  const idMap: Record<string, string> = {};

  // 1. Remap legacy IDs and labels
  const migratedCats: Category[] = [];
  const seenLabels = new Set<string>();

  // Initialize seen labels with canonical categories
  DEFAULT_CATEGORIES.forEach(c => seenLabels.add(normalizeLabel(c.name)));

  // Process user categories
  categories.forEach(cat => {
    const label = normalizeLabel(cat.name);

    // Rule A: Map specific legacy labels to canonical IDs
    if (LEGACY_MAPPING[label]) {
      idMap[cat.id] = LEGACY_MAPPING[label];
      changed = true;
      return;
    }

    // Rule B: Deduplicate against canonicals or existing migrated ones
    if (seenLabels.has(label)) {
      const canonicalMatch = DEFAULT_CATEGORIES.find(c => normalizeLabel(c.name) === label);
      if (canonicalMatch) {
        idMap[cat.id] = canonicalMatch.id;
        changed = true;
        return;
      }

      const customMatch = migratedCats.find(c => normalizeLabel(c.name) === label);
      if (customMatch) {
        idMap[cat.id] = customMatch.id;
        changed = true;
        return;
      }
    }

    // Rule D: Group integrity
    if (!cat.group || !CANONICAL_GROUPS.includes(cat.group as any)) {
      cat.group = 'Everyday';
      changed = true;
    }

    migratedCats.push(cat);
    seenLabels.add(label);
  });

  // Combine defaults and migrated custom cats
  const finalCategories = [...DEFAULT_CATEGORIES];
  migratedCats.forEach(cat => {
    if (!finalCategories.some(c => c.id === cat.id)) {
      finalCategories.push(cat);
    }
  });

  // 2. Remap transactions
  const migratedTransactions = transactions.map(t => {
    if (idMap[t.category]) {
      changed = true;
      return { ...t, category: idMap[t.category] };
    }
    // Safety check: if category ID is invalid/missing from the final list, fallback to Uncategorized
    if (!finalCategories.some(c => c.id === t.category)) {
      changed = true;
      return { ...t, category: 'cat-uncategorized' };
    }
    return t;
  });

  // 3. Remap vendor rules
  const migratedRules = vendorRules.map(r => {
    let rule = { ...r };
    let ruleChanged = false;

    if (idMap[r.categoryId]) {
      rule.categoryId = idMap[r.categoryId];
      ruleChanged = true;
    } else if (!finalCategories.some(c => c.id === r.categoryId)) {
      rule.categoryId = 'cat-uncategorized';
      ruleChanged = true;
    }

    // New format migration
    if (!(rule as any).vendorContains && (rule as any).vendor) {
      rule.vendorContains = (rule as any).vendor;
      ruleChanged = true;
    }
    if (!rule.source) {
      rule.source = 'user';
      ruleChanged = true;
    }
    if (!rule.createdAt) {
      rule.createdAt = Date.now();
      ruleChanged = true;
    }

    if (ruleChanged) changed = true;
    return rule;
  });

  return {
    categories: finalCategories,
    transactions: migratedTransactions,
    vendorRules: migratedRules,
    changed
  };
};

const DEFAULT_SETTINGS: Settings = {
  notifications: true,
  googleCalendarSync: false,
  googleCalendarAutoSync: false,
  includeRecurringInReports: false,
  disableDemoData: false,
};

const DEFAULT_IMPORTED_CATEGORY = {
  icon: 'Tag',
  color: '#94A3B8',
  group: 'Other',
} as const;

const sanitizeImportedGroup = (group?: string) => {
  if (!group) return DEFAULT_IMPORTED_CATEGORY.group;
  const match = CANONICAL_GROUPS.find((candidate) => candidate.toLowerCase() === group.trim().toLowerCase());
  return match ?? DEFAULT_IMPORTED_CATEGORY.group;
};

const sanitizeImportedColor = (color?: string) => {
  if (!color) return DEFAULT_IMPORTED_CATEGORY.color;
  const normalized = color.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized)
    ? normalized
    : DEFAULT_IMPORTED_CATEGORY.color;
};

const getNextRecurrenceDate = (date: Date, cadence: Transaction['recurrenceType']) => {
  switch (cadence) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addWeeks(date, 1);
    case 'yearly':
      return addYears(date, 1);
    case 'monthly':
    default:
      return addMonths(date, 1);
  }
};

const buildTransactionSignature = (transaction: Pick<Transaction, 'date' | 'amount' | 'vendor' | 'category'>) => {
  return [
    transaction.date,
    transaction.amount.toFixed(2),
    normalizeLabel(transaction.vendor),
    transaction.category,
  ].join('|');
};

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const { user, supabaseConfigured, syncCalendar } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [vendorRules, setVendorRules] = useState<VendorRule[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [recurringExceptions, setRecurringExceptions] = useState<RecurringException[]>([]);
  const [includeRecurring, setIncludeRecurringState] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const devVerificationLoggedRef = useRef(false);

  const setIncludeRecurring = React.useCallback((value: boolean) => {
    setIncludeRecurringState(value);
    setSettings(prev => {
      const newSettings = { ...prev, includeRecurringInReports: value };
      storage.set('settings', 'app_settings', newSettings);
      return newSettings;
    });
  }, []);

  const syncData = React.useCallback(async () => {
    if (!supabaseConfigured || !user) return;
    setIsSyncing(true);
    try {
      await SyncService.sync(
        transactions,
        categories,
        vendorRules,
        recurringExceptions,
        settings,
        (newTransactions, newCategories, newRules, newExceptions, newSettings) => {
          const reconciled = migrateData(newCategories, newTransactions, newRules);
          setTransactions(reconciled.transactions);
          setCategories(reconciled.categories);
          setVendorRules(reconciled.vendorRules);
          setRecurringExceptions(newExceptions);
          setSettings(prev => ({ ...prev, ...newSettings }));
        }
      );
    } finally {
      setIsSyncing(false);
    }
  }, [supabaseConfigured, user, transactions, categories, vendorRules, settings, recurringExceptions]);

  useEffect(() => {
    if (isHydrated && user && supabaseConfigured) {
      syncData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, user?.id, supabaseConfigured]);

  // Load initial data from IndexedDB (with localStorage migration) on mount
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

      // 3. Pipeline initialization
      const shouldSeedDemoData = dbTransactions.length === 0 && !dbSettings?.disableDemoData;
      let pipelineTransactions = dbTransactions.length > 0 ? dbTransactions : (shouldSeedDemoData ? generateDemoData() : []);
      let pipelineCategories = dbCategories.length > 0 ? dbCategories : DEFAULT_CATEGORIES;
      let pipelineRules = dbRules;
      let pipelineExceptions = dbExceptions;

      let needsSave = false;

      // Fix missing defaults
      if (dbCategories.length > 0) {
        const missingDefaults = DEFAULT_CATEGORIES.filter(
          defCat => !pipelineCategories.some(
            userCat =>
              normalizeLabel(userCat.name) === normalizeLabel(defCat.name) ||
              userCat.id === defCat.id,
          )
        );
        const merged = [...pipelineCategories, ...missingDefaults];
        const seenIds = new Set<string>();
        const deduplicated: Category[] = [];
        let didDeduplicate = false;
        merged.forEach(cat => {
          if (seenIds.has(cat.id)) {
            deduplicated.push({ ...cat, id: crypto.randomUUID(), updatedAt: Date.now() });
            didDeduplicate = true;
          } else {
            seenIds.add(cat.id);
            deduplicated.push(cat);
          }
        });
        pipelineCategories = deduplicated;
        if (didDeduplicate) needsSave = true;
      }

      // 4. Run Legacy Migration 
      const migrationVersion = localStorage.getItem('category_schema_v1');
      const hasLegacy = pipelineCategories.some(c => Object.keys(LEGACY_MAPPING).includes(normalizeLabel(c.name)));

      if (!migrationVersion || hasLegacy) {
        const { categories: migratedCats, transactions: migratedTrans, vendorRules: migratedRules, changed } = migrateData(
          pipelineCategories,
          pipelineTransactions,
          pipelineRules
        );

        if (changed || !migrationVersion) {
          pipelineCategories = migratedCats;
          pipelineTransactions = migratedTrans;
          pipelineRules = migratedRules;
          needsSave = true;
          localStorage.setItem('category_schema_v1', 'true');
        }
      }

      // 5. Enforce UUID Consistency
      const uuidMigrationResult = ensureUUIDs(pipelineTransactions, pipelineCategories, pipelineRules, pipelineExceptions);
      if (uuidMigrationResult.changed) {
        needsSave = true;
        for (const [oldId, _] of uuidMigrationResult.uuidMap.entries()) {
          await storage.remove('transactions', oldId);
          await storage.remove('categories', oldId);
          await storage.remove('vendorRules', oldId);
        }
        for (const e of pipelineExceptions) {
          if (uuidMigrationResult.uuidMap.has(e.ruleId)) {
            await storage.remove('recurringExceptions', `${e.ruleId}-${e.date}`);
          }
        }
        pipelineCategories = uuidMigrationResult.categories;
        pipelineTransactions = uuidMigrationResult.transactions;
        pipelineRules = uuidMigrationResult.vendorRules;
        pipelineExceptions = uuidMigrationResult.exceptions;
      }

      // 6. Final State Commit
      setCategories(pipelineCategories);
      setTransactions(pipelineTransactions);
      setVendorRules(pipelineRules);
      setRecurringExceptions(pipelineExceptions);

      if (dbSettings) {
        setSettings(dbSettings);
        if (dbSettings.defaultCategoryFilter) {
          setSelectedCategoryIds(dbSettings.defaultCategoryFilter);
        }
        if (dbSettings.includeRecurringInReports !== undefined) {
          setIncludeRecurringState(dbSettings.includeRecurringInReports);
        }
      }

      // 7. Persist pipeline if mutated
      // If we loaded demo data, it also counts as needsSave.
      if (needsSave || dbTransactions.length === 0) {
        for (const c of pipelineCategories) await storage.set('categories', c.id, c);
        for (const t of pipelineTransactions) await storage.set('transactions', t.id, t);
        for (const r of pipelineRules) await storage.set('vendorRules', r.id, r);
        for (const e of pipelineExceptions) await storage.set('recurringExceptions', `${e.ruleId}-${e.date}`, e);
      }

      setIsHydrated(true);
    }

    loadData();
  }, []);

  // Helpers for expansion
  const getSuggestedCategory = (vendor: string) => {
    const { categoryId } = suggestCategoryForVendor(vendor, vendorRules);
    return categoryId;
  };

  const expandTransactions = (baseTransactions: Transaction[]): Transaction[] => {
    const expanded: Transaction[] = [];
    const horizon = endOfYear(addYears(startOfToday(), 1)); // Generate for current and next year

    baseTransactions.forEach((t) => {
      expanded.push(t);

      if (t.isRecurring && t.recurrenceType && t.isActive !== false) {
        let currentDate = parseISO(t.date);
        const cutoffDateStr = t.endedAt || format(horizon, 'yyyy-MM-dd');
        const cutoffDate = parseISO(cutoffDateStr);

        const endDate = t.endDate ? parseISO(t.endDate) : horizon;
        const limit = isBefore(endDate, cutoffDate) ? endDate : cutoffDate;

        let nextDate = getNextRecurrenceDate(currentDate, t.recurrenceType);

        while (!isAfter(nextDate, limit)) {
          const dateStr = format(nextDate, 'yyyy-MM-dd');
          // Important: only find active exceptions (not deleted tombstones)
          const exception = recurringExceptions.find(e => e.ruleId === t.id && e.date === dateStr && !e.deletedAt);

          expanded.push({
            ...t,
            id: `${t.id}-${dateStr}`,
            date: dateStr,
            isVirtual: true,
            isSkipped: exception?.skipped || false,
            skipNote: exception?.note,
          } as any);

          nextDate = getNextRecurrenceDate(nextDate, t.recurrenceType);
        }
      }
    });

    return expanded;
  };

  // 2. Expand and process transactions
  const processedTransactions = React.useMemo(() => {
    // 0. Filter out cleanly deleted items (tombstones)
    const activeTransactions = transactions.filter(t => !t.deletedAt);

    // 1. Apply vendor rules first
    const withRules = activeTransactions.map((t) => {
      const suggestedCategory = getSuggestedCategory(t.vendor);
      if (suggestedCategory) {
        return { ...t, category: suggestedCategory };
      }
      return t;
    });

    // 2. Expand recurring
    return expandTransactions(withRules);
  }, [transactions, categories, vendorRules, recurringExceptions]);

  // 3. Apply global filters (on expanded set)
  const filteredTransactions = React.useMemo(() => {
    let filtered = processedTransactions;

    // Filter by category
    if (selectedCategoryIds.length > 0) {
      filtered = filtered.filter(t => selectedCategoryIds.includes(t.category));
    }

    // Filter by recurring toggle
    if (!includeRecurring) {
      filtered = filtered.filter(t => !t.isRecurring);
    }

    // Always exclude skipped virtual occurrences
    filtered = filtered.filter(t => !t.isSkipped);

    return filtered;
  }, [processedTransactions, selectedCategoryIds, includeRecurring]);

  // Calendar Sync Payload builder
  const buildCalendarPayload = React.useCallback((): LocalTransaction[] => {
    const today = new Date();
    const pastCutoff = format(addDays(today, -14), 'yyyy-MM-dd');
    const futureCutoff = format(addDays(today, 14), 'yyyy-MM-dd');

    return transactions
      .filter(t => !t.deletedAt && !t.isSkipped && t.date >= pastCutoff && t.date <= futureCutoff)
      .map(t => ({
        id: t.id,
        date: t.date,
        amount: t.amount,
        vendor: t.vendor,
        category: categories.find(c => c.id === t.category)?.name ?? t.category,
        isRecurring: !!t.isRecurring,
      }));
  }, [transactions, categories]);

  // Auto-sync Google Calendar on transaction changes (debounced)
  useEffect(() => {
    if (!isHydrated || !settings.googleCalendarAutoSync) return;

    const timeoutId = setTimeout(() => {
      // Only fire auto-sync if we have changes or at least every meaningful update
      // The edge function is idempotent so calling it is safe
      syncCalendar(buildCalendarPayload());
    }, 3000); // 3 second debounce to avoid spam while editing

    return () => clearTimeout(timeoutId);
  }, [transactions, recurringExceptions, settings.googleCalendarAutoSync, isHydrated]);

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

  useEffect(() => {
    if (!import.meta.env.DEV || !isHydrated || devVerificationLoggedRef.current) return;

    const activeCategories = categories.filter((category) => !category.deletedAt);
    const resolveCategoryName = (vendor: string) => {
      const categoryId = suggestCategoryForVendor(vendor, vendorRules).categoryId;
      return activeCategories.find((category) => category.id === categoryId)?.name ?? null;
    };

    devVerificationLoggedRef.current = true;
    console.info('[CalendarSpent][dev-check]', {
      defaultsExist: DEFAULT_CATEGORIES.every((defaultCategory) =>
        activeCategories.some(
          (category) =>
            category.id === defaultCategory.id ||
            normalizeLabel(category.name) === normalizeLabel(defaultCategory.name),
        ),
      ),
      vendorCategoryChecks: {
        'Uber Eats': resolveCategoryName('Uber Eats'),
        'Fido Mobile': resolveCategoryName('Fido Mobile'),
        Rent: resolveCategoryName('Rent'),
        Amazon: resolveCategoryName('Amazon'),
      },
    });
  }, [categories, vendorRules, isHydrated]);

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction = {
      ...transaction,
      id: crypto.randomUUID(),
      isActive: transaction.isRecurring ? true : undefined,
      updatedAt: Date.now(),
    };
    setTransactions((prev) => [...prev, newTransaction]);
    await storage.set('transactions', newTransaction.id, newTransaction);
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const now = Date.now();
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: now } : t))
    );
    const existing = transactions.find(t => t.id === id);
    if (existing) {
      await storage.set('transactions', id, { ...existing, ...updates, updatedAt: now });
    }
  };

  const deleteTransaction = async (id: string) => {
    const now = Date.now();

    // 1. Try exact match (one-time or base rule)
    const exactMatch = transactions.find(t => t.id === id);
    if (exactMatch) {
      setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, deletedAt: now, updatedAt: now } : t)));
      await storage.set('transactions', id, { ...exactMatch, deletedAt: now, updatedAt: now });
      return;
    }

    // 2. Try virtual ID (recurring instance)
    const parentRule = transactions.find(t => id.startsWith(`${t.id}-`));
    if (parentRule) {
      const datePart = id.substring(parentRule.id.length + 1);
      await skipOccurrence(parentRule.id, datePart, 'Deleted');
      toast.success('Occurrence removed');
      return;
    }
  };

  const bulkDeleteTransactions = async (ids: string[], recurringOption: 'single' | 'future' | 'all' = 'single') => {
    const now = Date.now();
    const currentTransactions = [...transactions];

    for (const id of ids) {
      // 1. Try exact match (one-time or base rule)
      const exactMatch = currentTransactions.find(t => t.id === id);
      if (exactMatch) {
        if (!exactMatch.isRecurring || recurringOption === 'all') {
          setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, deletedAt: now, updatedAt: now } : t)));
          await storage.set('transactions', id, { ...exactMatch, deletedAt: now, updatedAt: now });
        } else if (recurringOption === 'future') {
          const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd');
          await updateTransaction(id, { endedAt: yesterday, isActive: false });
        }
        continue;
      }

      // 2. Try virtual ID (recurring instance)
      const parentRule = currentTransactions.find(t => id.startsWith(`${t.id}-`));
      if (parentRule) {
        const ruleId = parentRule.id;
        const datePart = id.substring(ruleId.length + 1);

        if (recurringOption === 'single') {
          await skipOccurrence(ruleId, datePart, 'Bulk Deleted');
        } else if (recurringOption === 'future') {
          const dayBefore = format(addDays(parseISO(datePart), -1), 'yyyy-MM-dd');
          await updateTransaction(ruleId, { endedAt: dayBefore, isActive: false });
        } else if (recurringOption === 'all') {
          const rule = currentTransactions.find(t => t.id === ruleId);
          if (rule) {
            setTransactions((prev) => prev.map((t) => (t.id === ruleId ? { ...t, deletedAt: now, updatedAt: now } : t)));
            await storage.set('transactions', ruleId, { ...rule, deletedAt: now, updatedAt: now });
          }
        }
      }
    }
  };

  const validateCategory = (name: string, group: string, id?: string) => {
    const label = normalizeLabel(name);
    if (!label) {
      toast.error('Category name cannot be empty');
      return false;
    }
    if (!CANONICAL_GROUPS.includes(group as any)) {
      toast.error('Invalid category group');
      return false;
    }
    // Prevent shadowing canonical or existing custom names
    const isDuplicate = categories.some(c => normalizeLabel(c.name) === label && c.id !== id);
    if (isDuplicate) {
      toast.error('A category with this name already exists');
      return false;
    }
    return true;
  };

  const addCategory = async (category: Omit<Category, 'id'>) => {
    if (!validateCategory(category.name, category.group)) return;

    const newCategory = {
      ...category,
      id: crypto.randomUUID(),
      updatedAt: Date.now(),
    };
    setCategories((prev) => [...prev, newCategory]);
    await storage.set('categories', newCategory.id, newCategory);
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const existing = categories.find(c => c.id === id);
    if (!existing) return;

    if (!validateCategory(updates.name ?? existing.name, updates.group ?? existing.group, id)) return;

    const now = Date.now();
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: now } : c))
    );
    await storage.set('categories', id, { ...existing, ...updates, updatedAt: now });
  };

  const deleteCategory = (id: string) => {
    // Only allow deleting user-created categories (not starting with cat-)
    if (isSystemCategoryId(id)) {
      toast.error('System categories cannot be deleted');
      return;
    }

    const now = Date.now();
    const fallbackId = 'cat-uncategorized';

    // 1. Update State immediately
    setTransactions((prev) =>
      prev.map((t) => (t.category === id ? { ...t, category: fallbackId, updatedAt: now } : t))
    );
    setVendorRules((prev) =>
      prev.map((r) => (r.categoryId === id ? { ...r, categoryId: fallbackId, updatedAt: now } : r))
    );
    setCategories((prev) =>
      prev.map((c) => c.id === id ? { ...c, deletedAt: now, updatedAt: now } : c)
    );

    // 2. Persist to Storage
    const removeOperations = async () => {
      // Remap Transactions
      const allTransactions = await storage.getAll<Transaction>('transactions');
      const affectedTrans = allTransactions.filter(t => t.category === id);
      for (const t of affectedTrans) {
        await storage.set('transactions', t.id, { ...t, category: fallbackId, updatedAt: now });
      }

      // Remap Vendor Rules
      const allRules = await storage.getAll<VendorRule>('vendorRules');
      const affectedRules = allRules.filter(r => r.categoryId === id);
      for (const r of affectedRules) {
        await storage.set('vendorRules', r.id, { ...r, categoryId: fallbackId, updatedAt: now });
      }

      // Soft Delete Category
      const existing = categories.find(c => c.id === id);
      if (existing) {
        await storage.set('categories', id, { ...existing, deletedAt: now, updatedAt: now });
      }
    };
    removeOperations();

    toast.success('Category removed and transactions remapped');
  };

  const addVendorRule = async (rule: Omit<VendorRule, 'id' | 'source' | 'createdAt'>) => {
    const newRule: VendorRule = {
      ...rule,
      id: crypto.randomUUID(),
      source: 'user',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setVendorRules((prev) => [...prev, newRule]);
    await storage.set('vendorRules', newRule.id, newRule);
  };

  const deleteVendorRule = async (id: string) => {
    const now = Date.now();
    setVendorRules((prev) => prev.map((r) => r.id === id ? { ...r, deletedAt: now, updatedAt: now } : r));
    const existing = vendorRules.find(r => r.id === id);
    if (existing) {
      await storage.set('vendorRules', id, { ...existing, deletedAt: now, updatedAt: now });
    }
  };

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const getCategoryById = (id: string) => {
    return categories.find((c) => c.id === id && !c.deletedAt);
  };

  const getTransactionsByDate = (date: string) => {
    return transactions.filter((t) => t.date === date && !t.deletedAt);
  };

  const setSelectedCategories = (categoryIds: string[]) => {
    setSelectedCategoryIds(categoryIds);
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

  const skipOccurrence = async (ruleId: string, date: string, note?: string) => {
    const id = `${ruleId}-${date}`;
    const newException: RecurringException = {
      id,
      ruleId,
      date,
      skipped: true,
      note,
      updatedAt: Date.now()
    };
    setRecurringExceptions(prev => [
      ...prev.filter(e => e.id !== id),
      newException
    ]);
    await storage.set('recurringExceptions', id, newException);
  };

  const unskipOccurrence = async (ruleId: string, date: string) => {
    const id = `${ruleId}-${date}`;
    const now = Date.now();
    setRecurringExceptions(prev => prev.map(e => (e.id === id ? { ...e, deletedAt: now, updatedAt: now } : e)));
    const existing = recurringExceptions.find(e => e.id === id);
    if (existing) {
      const updated = { ...existing, deletedAt: now, updatedAt: now };
      await storage.set('recurringExceptions', id, updated);
    }
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

  const exportBackup = () => {
    try {
      const backupData = {
        version: "1",
        exportedAt: new Date().toISOString(),
        expenses: transactions,
        categories,
        vendorRules,
        settings,
        recurringExceptions
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const dateStr = format(new Date(), 'yyyy-MM-dd');
      link.href = url;
      link.download = `calendarspent-backup-${dateStr}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Backup exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export backup');
    }
  };

  const importBackup = async (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);

      // Basic validation
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !parsed.version ||
        !Array.isArray(parsed.expenses)
      ) {
        throw new Error('Invalid Backup JSON. Use a backup exported from CalendarSpent.');
      }

      // Clear all existing data from DB
      await storage.clearAll();

      // Also clear legacy localStorage keys just in case
      localStorage.removeItem('transactions');
      localStorage.removeItem('categories');
      localStorage.removeItem('vendorRules');
      localStorage.removeItem('settings');
      localStorage.removeItem('recurringExceptions');

      const restoredTransactions = parsed.expenses || [];
      const restoredCategories = parsed.categories || DEFAULT_CATEGORIES;
      const restoredRules = parsed.vendorRules || [];
      const restoredSettings = parsed.settings || DEFAULT_SETTINGS;
      const restoredExceptions = parsed.recurringExceptions || [];
      const {
        categories: reconciledCategories,
        transactions: reconciledTransactions,
        vendorRules: reconciledRules,
      } = migrateData(restoredCategories, restoredTransactions, restoredRules);

      // Update state (this will trigger the useEffect syncs to write to DB)
      setTransactions(reconciledTransactions);
      setCategories(reconciledCategories);
      setVendorRules(reconciledRules);
      setSettings(restoredSettings);
      setRecurringExceptions(restoredExceptions);

      if (restoredSettings.defaultCategoryFilter) {
        setSelectedCategoryIds(restoredSettings.defaultCategoryFilter);
      } else {
        setSelectedCategoryIds([]);
      }

      toast.success('Backup imported successfully');
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import backup JSON.');
    }
  };

  const importSpreadsheet = async (
    data: ParsedSpreadsheetImport,
    onProgress?: (message: string, percent: number) => void,
  ): Promise<SpreadsheetImportSummary> => {
    const activeCategories = categories.filter((category) => !category.deletedAt);
    const activeTransactions = transactions.filter((transaction) => !transaction.deletedAt && !transaction.isVirtual);
    const nextCategories = [...activeCategories];
    const nextTransactions = [...activeTransactions];
    const existingCategoryMap = new Map(
      activeCategories.map((category) => [normalizeLabel(category.name), category]),
    );
    const seenTransactionSignatures = new Set(
      activeTransactions.map((transaction) => buildTransactionSignature(transaction)),
    );
    const recurringKeyMap = new Map(
      activeTransactions
        .filter((transaction) => transaction.isRecurring && transaction.recurringKey)
        .map((transaction) => [transaction.recurringKey as string, transaction.id]),
    );

    const createdCategories: Category[] = [];
    const createdRecurring: Transaction[] = [];
    const createdExpenses: Transaction[] = [];
    let skippedDuplicates = 0;
    let skippedRecurringExpenseRows = 0;

    const updateImportProgress = (message: string, percent: number) => {
      onProgress?.(message, percent);
    };

    const ensureCategory = (
      categoryName: string,
      options?: { group?: string; icon?: string; color?: string },
    ) => {
      const normalizedName = normalizeLabel(categoryName);
      const existing = existingCategoryMap.get(normalizedName);
      if (existing) {
        return existing.id;
      }

      const newCategory: Category = {
        id: crypto.randomUUID(),
        name: categoryName.trim(),
        group: sanitizeImportedGroup(options?.group),
        icon: options?.icon?.trim() || DEFAULT_IMPORTED_CATEGORY.icon,
        color: sanitizeImportedColor(options?.color),
        updatedAt: Date.now(),
      };

      existingCategoryMap.set(normalizedName, newCategory);
      nextCategories.push(newCategory);
      createdCategories.push(newCategory);
      return newCategory.id;
    };

    updateImportProgress('Creating categories', 20);
    data.categories.forEach((row) => {
      ensureCategory(row.name, {
        group: row.group,
        icon: row.icon,
        color: row.color,
      });
    });

    data.recurring.forEach((row) => {
      ensureCategory(row.category);
    });

    data.expenses.forEach((row) => {
      ensureCategory(row.category);
    });

    updateImportProgress('Creating recurring items', 55);
    data.recurring.forEach((row) => {
      const existingRecurringId = recurringKeyMap.get(row.recurringKey);
      if (existingRecurringId) {
        skippedDuplicates += 1;
        return;
      }

      const categoryId = ensureCategory(row.category);
      const recurringTransaction: Transaction = {
        id: crypto.randomUUID(),
        vendor: row.vendor.trim(),
        amount: row.amount,
        category: categoryId,
        date: row.startDate,
        note: row.notes,
        isRecurring: true,
        recurrenceType: row.cadence,
        recurringKey: row.recurringKey,
        endDate: row.endDate,
        isActive: true,
        updatedAt: Date.now(),
      };

      const signature = buildTransactionSignature(recurringTransaction);
      if (seenTransactionSignatures.has(signature)) {
        skippedDuplicates += 1;
        const matchingTransaction = nextTransactions.find(
          (transaction) =>
            transaction.isRecurring && buildTransactionSignature(transaction) === signature,
        );
        if (matchingTransaction) {
          recurringKeyMap.set(row.recurringKey, matchingTransaction.id);
        }
        return;
      }

      seenTransactionSignatures.add(signature);
      recurringKeyMap.set(row.recurringKey, recurringTransaction.id);
      nextTransactions.push(recurringTransaction);
      createdRecurring.push(recurringTransaction);
    });

    updateImportProgress('Importing expenses', 80);
    data.expenses.forEach((row) => {
      if (row.isRecurring && row.recurringKey) {
        skippedRecurringExpenseRows += 1;
        return;
      }

      const categoryId = ensureCategory(row.category);
      const expenseTransaction: Transaction = {
        id: crypto.randomUUID(),
        vendor: row.vendor.trim(),
        amount: row.amount,
        category: categoryId,
        date: row.date,
        note: row.notes,
        currency: row.currency,
        updatedAt: Date.now(),
      };

      const signature = buildTransactionSignature(expenseTransaction);
      if (seenTransactionSignatures.has(signature)) {
        skippedDuplicates += 1;
        return;
      }

      seenTransactionSignatures.add(signature);
      nextTransactions.push(expenseTransaction);
      createdExpenses.push(expenseTransaction);
    });

    updateImportProgress('Saving imported data', 95);
    setCategories((prev) => [...prev, ...createdCategories]);
    setTransactions((prev) => [...prev, ...createdRecurring, ...createdExpenses]);

    for (const category of createdCategories) {
      await storage.set('categories', category.id, category);
    }

    for (const transaction of [...createdRecurring, ...createdExpenses]) {
      await storage.set('transactions', transaction.id, transaction);
    }

    const warnings = [...data.warnings];
    if (skippedRecurringExpenseRows > 0) {
      warnings.push(
        `Skipped ${skippedRecurringExpenseRows} recurring-linked expense row${skippedRecurringExpenseRows === 1 ? '' : 's'} because CalendarSpent generates those occurrences from the Recurring sheet.`,
      );
    }

    updateImportProgress('Import complete', 100);
    return {
      expenses: createdExpenses.length,
      categories: createdCategories.length,
      recurring: createdRecurring.length,
      skippedDuplicates,
      skippedRecurringExpenseRows,
      warnings,
    };
  };

  const clearAllData = async () => {
    try {
      // ── 1. Wipe Supabase data (if signed in) ──────────────────────────────
      const { supabase } = await import('../../lib/supabaseClient');
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const uid = session.user.id;
          const remoteTables = [
            'budgets',
            'google_calendar_events',
            'recurring_exceptions',
            'vendor_rules',
            'expenses',
          ] as const;

          for (const table of remoteTables) {
            const { error } = await supabase.from(table).delete().eq('user_id', uid);
            if (error) {
              throw new Error(`Failed to clear ${table}: ${error.message}`);
            }
          }

          const { error: categoryError } = await supabase
            .from('categories')
            .delete()
            .eq('user_id', uid)
            .eq('is_system', false);

          if (categoryError) {
            throw new Error(`Failed to clear custom categories: ${categoryError.message}`);
          }

          await ensureSystemCategories(uid);
        }
      }

      // ── 2. Wipe local storage ─────────────────────────────────────────────
      await storage.clearAll();
      localStorage.removeItem('transactions');
      localStorage.removeItem('categories');
      localStorage.removeItem('vendorRules');
      localStorage.removeItem('settings');
      localStorage.removeItem('recurringExceptions');
      localStorage.removeItem('indexeddb_migrated');
      localStorage.removeItem('category_schema_v1');

      const freshSettings: Settings = {
        ...DEFAULT_SETTINGS,
        defaultCategoryFilter: [],
        disableDemoData: true,
        lastPullAt: Date.now(),
        lastPushAt: Date.now(),
        lastSyncError: undefined,
      };

      for (const category of DEFAULT_CATEGORIES) {
        await storage.set('categories', category.id, category);
      }
      await storage.set('settings', 'app_settings', freshSettings);

      // ── 3. Reset React state ──────────────────────────────────────────────
      setTransactions([]);
      setCategories(DEFAULT_CATEGORIES);
      setVendorRules([]);
      setSettings(freshSettings);
      setRecurringExceptions([]);
      setSelectedCategoryIds([]);
      setIncludeRecurring(false);

      toast.success('Expenses, budgets, recurring items, and custom categories were cleared');
    } catch (error) {
      console.error('Clear data failed:', error);
      toast.error('Failed to clear data');
    }
  };


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
        categories: categories.filter(c => !c.deletedAt),
        vendorRules: vendorRules.filter(r => !r.deletedAt),
        settings,
        selectedCategoryIds,
        addTransaction,
        updateTransaction,
        updateRecurringRule,
        deleteTransaction,
        bulkDeleteTransactions,
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
        includeRecurring,
        setIncludeRecurring,
        filteredTransactions,
        exportBackup,
        importBackup,
        importSpreadsheet,
        clearAllData,
        isHydrated,
        syncData,
        isSyncing,
        selectedDate,
        setSelectedDate,
        buildCalendarPayload
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
