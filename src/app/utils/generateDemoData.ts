import { format, subDays } from 'date-fns';
import { Transaction } from '../types';

const demoVendors = [
  { name: 'Starbucks', category: 'cat-coffee', amounts: [4.50, 5.75, 6.25] },
  { name: 'Chipotle', category: 'cat-food', amounts: [12.50, 13.75, 15.00] },
  { name: 'Whole Foods', category: 'cat-groceries', amounts: [45.50, 67.20, 52.30, 89.45] },
  { name: 'Target', category: 'cat-shopping', amounts: [34.99, 56.75, 89.99] },
  { name: 'Uber', category: 'cat-ride-sharing', amounts: [15.50, 22.75, 18.20] },
  { name: 'AMC Theaters', category: 'cat-ent', amounts: [24.50, 36.00] },
  { name: 'Blue Bottle Coffee', category: 'cat-coffee', amounts: [5.25, 6.00] },
  { name: 'Sweetgreen', category: 'cat-food', amounts: [14.50, 16.25] },
  { name: 'Amazon', category: 'cat-amazon', amounts: [27.99, 45.50, 89.99, 123.45] },
  { name: 'Shake Shack', category: 'cat-food', amounts: [18.50, 22.00] },
  { name: 'Trader Joes', category: 'cat-groceries', amounts: [38.20, 52.10, 71.30] },
  { name: 'Lyft', category: 'cat-ride-sharing', amounts: [12.30, 19.50] },
  { name: 'CVS', category: 'cat-personal', amounts: [15.99, 28.50] },
  { name: 'Netflix', category: 'cat-subs', amounts: [15.99] },
  { name: 'Spotify', category: 'cat-subs', amounts: [10.99] },
];

export function generateDemoData(): Transaction[] {
  const transactions: Transaction[] = [];
  const today = new Date();

  // Generate random transactions for the past 45 days with higher recent activity
  for (let i = 0; i < 45; i++) {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');

    // More transactions in recent weeks (especially this week and last week)
    let numTransactions;
    if (i < 7) {
      // This week: 2-5 transactions per day
      numTransactions = Math.floor(Math.random() * 4) + 2;
    } else if (i < 14) {
      // Last week: 1-4 transactions per day
      numTransactions = Math.floor(Math.random() * 4) + 1;
    } else {
      // Older: 0-3 transactions per day
      numTransactions = Math.floor(Math.random() * 4);
    }

    for (let j = 0; j < numTransactions; j++) {
      const vendor = demoVendors[Math.floor(Math.random() * demoVendors.length)];
      const amount = vendor.amounts[Math.floor(Math.random() * vendor.amounts.length)];

      transactions.push({
        id: crypto.randomUUID(),
        vendor: vendor.name,
        amount,
        category: vendor.category,
        date: dateStr,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any);
    }
  }

  return transactions;
}
