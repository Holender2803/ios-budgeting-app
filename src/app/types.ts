export interface Transaction {
  id: string;
  vendor: string;
  amount: number;
  category: string;
  date: string; // ISO date string
  note?: string;
  currency?: string;
  photoUrl?: string;
  isRecurring?: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurringKey?: string;
  endDate?: string; // Optional end date for recurring transactions
  isVirtual?: boolean; // For generated occurrences
  isActive?: boolean; // For recurring rules toggle
  endedAt?: string; // When a rule was "deleted" (cutoff)
  isSkipped?: boolean; // For expanded virtual occurrences
  skipNote?: string;
  updatedAt?: number; // Added for Supabase Sync resolution
  deletedAt?: number; // Used as tombstone marker for generic sync logic
}

export interface RecurringException {
  id: string; // ruleId-date
  ruleId: string;
  date: string;
  skipped: boolean;
  note?: string;
  updatedAt?: number;
  deletedAt?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  group: string;
  updatedAt?: number;
  deletedAt?: number;
}

export interface VendorRule {
  id: string;
  vendorContains: string; // Changed from 'vendor' to be more descriptive
  categoryId: string;
  source: 'default' | 'user';
  createdAt: number;
  updatedAt?: number;
  deletedAt?: number;
}

export type ViewMode = 'daily' | 'weekly' | 'monthly';

export interface Settings {
  notifications: boolean;
  googleCalendarSync: boolean;
  googleCalendarAutoSync: boolean; // Future-ready: auto-sync toggle when connected
  defaultCategoryFilter?: string[]; // Array of category IDs to filter by default
  lastPullAt?: number; // UTC timestamp of last successful Supabase Pull
  lastPushAt?: number; // UTC timestamp of last successful Supabase Push
  lastSyncError?: string; // Message documenting why sync failed
  includeRecurringInReports?: boolean; // Persisted toggle state for Reports screen
  currency?: string; // Selected currency code (CAD, USD, EUR, GBP, AUD)
  disableDemoData?: boolean; // Prevent demo data from being re-seeded after a reset
}

export interface GoogleCalendarStatus {
  connected: boolean;
  calendarId: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  syncError: string | null;
  status: string | null;
}
