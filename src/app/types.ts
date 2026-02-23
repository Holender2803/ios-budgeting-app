export interface Transaction {
  id: string;
  vendor: string;
  amount: number;
  category: string;
  date: string; // ISO date string
  note?: string;
  photoUrl?: string;
  isRecurring?: boolean;
  recurrenceType?: 'weekly' | 'monthly';
  endDate?: string; // Optional end date for recurring transactions
  isVirtual?: boolean; // For generated occurrences
  isActive?: boolean; // For recurring rules toggle
  endedAt?: string; // When a rule was "deleted" (cutoff)
  isSkipped?: boolean; // For expanded virtual occurrences
  skipNote?: string;
}

export interface RecurringException {
  ruleId: string;
  date: string;
  skipped: boolean;
  note?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  group: string;
}

export interface VendorRule {
  id: string;
  vendorContains: string; // Changed from 'vendor' to be more descriptive
  categoryId: string;
  source: 'default' | 'user';
  createdAt: number;
}

export type ViewMode = 'daily' | 'weekly' | 'monthly';

export interface Settings {
  notifications: boolean;
  googleCalendarSync: boolean;
  defaultCategoryFilter?: string[]; // Array of category IDs to filter by default
}