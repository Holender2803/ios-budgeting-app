import { Category } from '../types';

const normalizeSystemCategoryName = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

export const SYSTEM_CATEGORIES: Category[] = [
  { id: 'cat-amazon', name: 'Amazon', icon: 'Package', color: '#F59E0B', group: 'Everyday' },
  { id: 'cat-going-out', name: 'Going Out', icon: 'Wine', color: '#2563EB', group: 'Everyday' },
  { id: 'cat-coffee', name: 'Coffee & Drinks', icon: 'Coffee', color: '#A0826D', group: 'Everyday' },
  { id: 'cat-food', name: 'Food & Dining', icon: 'UtensilsCrossed', color: '#E76F51', group: 'Everyday' },
  { id: 'cat-groceries', name: 'Groceries', icon: 'ShoppingCart', color: '#81B29A', group: 'Everyday' },
  { id: 'cat-takeout', name: 'Takeout / Delivery', icon: 'Truck', color: '#0F766E', group: 'Everyday' },
  { id: 'cat-ent', name: 'Entertainment', icon: 'Film', color: '#F4A261', group: 'Everyday' },
  { id: 'cat-hobbies', name: 'Hobbies', icon: 'Gamepad2', color: '#27AE60', group: 'Everyday' },
  { id: 'cat-personal', name: 'Personal Care', icon: 'UserRound', color: '#9B51E0', group: 'Everyday' },
  { id: 'cat-haircut-grooming', name: 'Haircut & Grooming', icon: 'Scissors', color: '#EC4899', group: 'Everyday' },
  { id: 'cat-shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#3D9BE9', group: 'Everyday' },
  { id: 'cat-online-shopping', name: 'Online Shopping', icon: 'Globe', color: '#6366F1', group: 'Everyday' },
  { id: 'cat-rent', name: 'Rent / Housing', icon: 'House', color: '#2D9CDB', group: 'Home & Life' },
  { id: 'cat-util', name: 'Utilities', icon: 'Zap', color: '#F2C94C', group: 'Home & Life' },
  { id: 'cat-internet-mobile', name: 'Internet & Mobile', icon: 'Wifi', color: '#0284C7', group: 'Home & Life' },
  { id: 'cat-subs', name: 'Subscriptions', icon: 'Repeat', color: '#BB6BD9', group: 'Home & Life' },
  { id: 'cat-household', name: 'Household', icon: 'Box', color: '#828282', group: 'Home & Life' },
  { id: 'cat-furniture', name: 'Furniture & Decor', icon: 'Armchair', color: '#8B4513', group: 'Home & Life' },
  { id: 'cat-home-maintenance', name: 'Home Maintenance', icon: 'Hammer', color: '#64748B', group: 'Home & Life' },
  { id: 'cat-pets', name: 'Pets', icon: 'PawPrint', color: '#D97706', group: 'Home & Life' },
  { id: 'cat-transport', name: 'Transport', icon: 'Bike', color: '#E07A5F', group: 'Getting Around' },
  { id: 'cat-public-transit', name: 'Public Transit', icon: 'Bus', color: '#2563EB', group: 'Getting Around' },
  { id: 'cat-ride-sharing', name: 'Ride Sharing', icon: 'CarFront', color: '#7C3AED', group: 'Getting Around' },
  { id: 'cat-gas', name: 'Gas', icon: 'Fuel', color: '#333333', group: 'Getting Around' },
  { id: 'cat-parking', name: 'Parking', icon: 'ParkingCircle', color: '#2F80ED', group: 'Getting Around' },
  { id: 'cat-car', name: 'Car Maintenance', icon: 'Wrench', color: '#4F4F4F', group: 'Getting Around' },
  { id: 'cat-travel', name: 'Travel', icon: 'Plane', color: '#56CCF2', group: 'Getting Around' },
  { id: 'cat-health', name: 'Health & Medical', icon: 'HeartPulse', color: '#EB5757', group: 'Health & Growth' },
  { id: 'cat-therapy-mental-health', name: 'Therapy & Mental Health', icon: 'Brain', color: '#8B5CF6', group: 'Health & Growth' },
  { id: 'cat-fitness', name: 'Fitness', icon: 'Dumbbell', color: '#27AE60', group: 'Health & Growth' },
  { id: 'cat-edu', name: 'Education', icon: 'GraduationCap', color: '#2F80ED', group: 'Health & Growth' },
  { id: 'cat-insure', name: 'Insurance', icon: 'ShieldCheck', color: '#2196F3', group: 'Money Matters' },
  { id: 'cat-bank', name: 'Bank Charges', icon: 'Landmark', color: '#4F4F4F', group: 'Money Matters' },
  { id: 'cat-taxes', name: 'Taxes & Fees', icon: 'Receipt', color: '#828282', group: 'Money Matters' },
  { id: 'cat-debt', name: 'Debt Payments', icon: 'Wallet', color: '#6B7280', group: 'Money Matters' },
  { id: 'cat-credit-card-payments', name: 'Credit Card Payments', icon: 'CreditCard', color: '#0F172A', group: 'Money Matters' },
  { id: 'cat-gifts', name: 'Gifts', icon: 'Gift', color: '#F2C94C', group: 'Giving' },
  { id: 'cat-uncategorized', name: 'Uncategorized', icon: 'CircleHelp', color: '#94A3B8', group: 'Other' },
];

export const SYSTEM_CATEGORY_NAME_TO_ID = Object.fromEntries(
  SYSTEM_CATEGORIES.map((category) => [category.name, category.id]),
) as Record<string, string>;

const SYSTEM_CATEGORY_BY_NORMALIZED_NAME = new Map(
  SYSTEM_CATEGORIES.map((category) => [normalizeSystemCategoryName(category.name), category]),
);

export const DEFAULT_RECENT_CATEGORY_IDS = [
  'cat-food',
  'cat-groceries',
  'cat-amazon',
  'cat-transport',
  'cat-coffee',
] as const;

export const getSystemCategoryByName = (name: string) =>
  SYSTEM_CATEGORY_BY_NORMALIZED_NAME.get(normalizeSystemCategoryName(name));

export const getSystemCategoryIdByName = (name: string) =>
  getSystemCategoryByName(name)?.id ?? null;

export const isSystemCategoryId = (id: string) => id.startsWith('cat-');
