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
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface VendorRule {
  id: string;
  vendor: string;
  categoryId: string;
}

export type ViewMode = 'daily' | 'weekly' | 'monthly';

export interface Settings {
  notifications: boolean;
  googleCalendarSync: boolean;
  defaultCategoryFilter?: string[]; // Array of category IDs to filter by default
}