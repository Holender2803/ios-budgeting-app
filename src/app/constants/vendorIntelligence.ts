import { VendorRule } from '../types';
import { getSystemCategoryIdByName } from './systemCategories';

type MatchTier = 0 | 1 | 2 | 3;

type PremadeVendorRuleDefinition = {
  vendor: string;
  categoryName: string;
};

type VendorRuleCandidate = {
  vendor: string;
  categoryId: string;
  source: 'user' | 'premade';
};

const requireSystemCategoryId = (categoryName: string) => {
  const categoryId = getSystemCategoryIdByName(categoryName);
  if (!categoryId) {
    throw new Error(`Missing system category for vendor rule: ${categoryName}`);
  }
  return categoryId;
};

export const normalizeVendorText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const PREMADE_VENDOR_RULE_DEFINITIONS: PremadeVendorRuleDefinition[] = [
  { vendor: 'Rabba', categoryName: 'Groceries' },
  { vendor: 'Freshco', categoryName: 'Groceries' },
  { vendor: 'Farm Boy', categoryName: 'Groceries' },
  { vendor: 'Loblaws', categoryName: 'Groceries' },
  { vendor: 'St Lawrence Market', categoryName: 'Groceries' },
  { vendor: 'The Source Bulk Food', categoryName: 'Groceries' },
  { vendor: 'Voila.Ca', categoryName: 'Groceries' },
  { vendor: 'Tim Hortons', categoryName: 'Coffee & Drinks' },
  { vendor: 'Starbucks', categoryName: 'Coffee & Drinks' },
  { vendor: 'Aroma Espresso', categoryName: 'Coffee & Drinks' },
  { vendor: 'Everyday Gourmet Coffe', categoryName: 'Coffee & Drinks' },
  { vendor: 'Sumach Espresso', categoryName: 'Coffee & Drinks' },
  { vendor: 'Victoria Cafe', categoryName: 'Coffee & Drinks' },
  { vendor: 'Figs Breakfast', categoryName: 'Food & Dining' },
  { vendor: 'Gyubee Japanese', categoryName: 'Food & Dining' },
  { vendor: 'Liberty Pizzeri', categoryName: 'Food & Dining' },
  { vendor: 'Subway', categoryName: 'Food & Dining' },
  { vendor: 'Ramen', categoryName: 'Food & Dining' },
  { vendor: 'Korean Grill House', categoryName: 'Food & Dining' },
  { vendor: 'Le Beau', categoryName: 'Food & Dining' },
  { vendor: 'Uber Eats', categoryName: 'Takeout / Delivery' },
  { vendor: 'Moxies', categoryName: 'Going Out' },
  { vendor: 'The Aviary', categoryName: 'Going Out' },
  { vendor: 'The Beer Store', categoryName: 'Going Out' },
  { vendor: 'Carload On The Beach', categoryName: 'Going Out' },
  { vendor: 'Presto', categoryName: 'Public Transit' },
  { vendor: 'Bike Share Toronto', categoryName: 'Transport' },
  { vendor: 'Uber', categoryName: 'Ride Sharing' },
  { vendor: 'Circle K', categoryName: 'Gas' },
  { vendor: 'Old Navy', categoryName: 'Shopping' },
  { vendor: 'Winners', categoryName: 'Shopping' },
  { vendor: 'Marshalls', categoryName: 'Shopping' },
  { vendor: 'Dollarama', categoryName: 'Shopping' },
  { vendor: 'Staples', categoryName: 'Shopping' },
  { vendor: 'Bmv Book Store', categoryName: 'Shopping' },
  { vendor: 'Kodak Lens', categoryName: 'Personal Care' },
  { vendor: 'Shoppers', categoryName: 'Personal Care' },
  { vendor: 'Amazon', categoryName: 'Amazon' },
  { vendor: 'Rent', categoryName: 'Rent / Housing' },
  { vendor: 'Cineplex', categoryName: 'Entertainment' },
  { vendor: 'Scotiabank Aren', categoryName: 'Entertainment' },
  { vendor: 'ChatGPT', categoryName: 'Subscriptions' },
  { vendor: 'Bjj', categoryName: 'Fitness' },
  { vendor: 'The Richmond Dental', categoryName: 'Health & Medical' },
  { vendor: 'Fido Mobile', categoryName: 'Internet & Mobile' },
  { vendor: 'Knick Knack Paddywhack', categoryName: 'Pets' },
];

export const PREMADE_VENDOR_RULES = PREMADE_VENDOR_RULE_DEFINITIONS.map((rule) => ({
  vendor: rule.vendor,
  categoryId: requireSystemCategoryId(rule.categoryName),
})) as ReadonlyArray<{ vendor: string; categoryId: string }>;

export const PREMADE_VENDOR_NAMES = PREMADE_VENDOR_RULES.map((rule) => rule.vendor);

const getMatchTier = (input: string, candidate: string): MatchTier => {
  if (!input || !candidate) return 0;
  if (input === candidate) return 3;
  if (input.startsWith(candidate) || candidate.startsWith(input)) return 2;
  if (input.includes(candidate) || candidate.includes(input)) return 1;
  return 0;
};

export const sortVendorMatches = (query: string, candidates: string[], limit?: number) => {
  const normalizedQuery = normalizeVendorText(query);
  if (!normalizedQuery) return [];

  const deduped = new Map<string, string>();
  candidates.forEach((candidate) => {
    const normalizedCandidate = normalizeVendorText(candidate);
    if (!normalizedCandidate) return;
    if (!deduped.has(normalizedCandidate)) {
      deduped.set(normalizedCandidate, candidate);
    }
  });

  const ranked = Array.from(deduped.entries())
    .map(([normalized, display]) => ({
      display,
      normalized,
      tier: getMatchTier(normalizedQuery, normalized),
    }))
    .filter((candidate) => candidate.tier > 0)
    .sort((a, b) => {
      if (b.tier !== a.tier) return b.tier - a.tier;
      return a.display.localeCompare(b.display);
    })
    .map((candidate) => candidate.display);

  return typeof limit === 'number' ? ranked.slice(0, limit) : ranked;
};

export const findBestVendorCategoryMatch = (vendor: string, userRules: VendorRule[]) => {
  const normalizedVendor = normalizeVendorText(vendor);
  if (!normalizedVendor) {
    return { categoryId: null as string | null, matchedVendor: null as string | null };
  }

  const candidates: VendorRuleCandidate[] = [
    ...userRules
      .filter((rule) => !rule.deletedAt)
      .map((rule) => ({
        vendor: rule.vendorContains,
        categoryId: rule.categoryId,
        source: 'user' as const,
      })),
    ...PREMADE_VENDOR_RULES.map((rule) => ({
      vendor: rule.vendor,
      categoryId: rule.categoryId,
      source: 'premade' as const,
    })),
  ];

  const ranked = candidates
    .map((candidate) => {
      const normalizedCandidate = normalizeVendorText(candidate.vendor);
      return {
        ...candidate,
        normalizedCandidate,
        tier: getMatchTier(normalizedVendor, normalizedCandidate),
      };
    })
    .filter((candidate) => candidate.tier > 0)
    .sort((a, b) => {
      if (b.tier !== a.tier) return b.tier - a.tier;
      if (b.normalizedCandidate.length !== a.normalizedCandidate.length) {
        return b.normalizedCandidate.length - a.normalizedCandidate.length;
      }
      if (a.source !== b.source) {
        return a.source === 'user' ? -1 : 1;
      }
      return a.vendor.localeCompare(b.vendor);
    });

  const best = ranked[0];
  if (!best) {
    return { categoryId: null as string | null, matchedVendor: null as string | null };
  }

  return {
    categoryId: best.categoryId,
    matchedVendor: best.vendor,
  };
};
