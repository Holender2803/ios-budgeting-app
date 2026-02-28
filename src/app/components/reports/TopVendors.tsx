import { useMemo, useState } from 'react';
import { Transaction, Category } from '../../types';
import * as LucideIcons from 'lucide-react';
import { Store, ChevronRight } from 'lucide-react';
import { MerchantListSheet } from './MerchantListSheet';
import { MerchantDetailSheet } from './MerchantDetailSheet';

interface TopVendorsProps {
    transactions: Transaction[];
    categories: Category[];
    limit?: number;
}

export function TopVendors({ transactions, categories, limit = 5 }: TopVendorsProps) {
    const [isListOpen, setIsListOpen] = useState(false);
    const [selectedMerchant, setSelectedMerchant] = useState<{ name: string, amount: number } | null>(null);

    const data = useMemo(() => {
        const vendorMap: Record<string, { amount: number; count: number; categoryIds: Record<string, number> }> = {};

        // Aggregate by vendor (ignoring case)
        transactions.forEach(t => {
            if (!t.vendor) return;
            const vendorKey = t.vendor.trim().toLowerCase();

            if (!vendorMap[vendorKey]) {
                vendorMap[vendorKey] = { amount: 0, count: 0, categoryIds: {} };
            }

            vendorMap[vendorKey].amount += t.amount;
            vendorMap[vendorKey].count += 1;
            vendorMap[vendorKey].categoryIds[t.category] = (vendorMap[vendorKey].categoryIds[t.category] || 0) + 1;
        });

        // Map to array, sort, and resolve dominant category
        const ranked = Object.entries(vendorMap)
            .map(([key, stats]) => {
                // Find the most frequent category for this vendor
                const dominantCategoryId = Object.entries(stats.categoryIds)
                    .sort((a, b) => b[1] - a[1])[0]?.[0];

                const category = categories.find(c => c.id === dominantCategoryId);

                // Capitalize vendor name for display
                const displayName = key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                return {
                    name: displayName,
                    amount: stats.amount,
                    txCount: stats.count,
                    categoryName: category?.name || 'Unknown',
                    categoryIcon: category?.icon || 'Store',
                };
            })
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit);

        return ranked;
    }, [transactions, categories, limit]);

    if (data.length === 0) return null;

    return (
        <>
            <div className="bg-white p-5 rounded-[16px] shadow-sm flex flex-col w-full font-dm-sans">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest">
                        Top Merchants
                    </h3>
                    <button
                        onClick={() => setIsListOpen(true)}
                        className="text-xs font-bold text-blue-600 active:opacity-70 transition-opacity"
                    >
                        See all
                    </button>
                </div>

                <div className="space-y-4">
                    {data.map((item, index) => {
                        const Icon = (LucideIcons as any)[item.categoryIcon] || Store;

                        return (
                            <div
                                key={item.name}
                                className="flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all"
                                onClick={() => setSelectedMerchant({ name: item.name, amount: item.amount })}
                            >
                                <div className="flex items-center gap-3 w-full">
                                    {/* Rank Number */}
                                    <div className="w-5 flex-none text-right">
                                        <span className="text-[13px] font-bold text-gray-400">
                                            {index + 1}.
                                        </span>
                                    </div>

                                    {/* Icon Circle */}
                                    <div className="w-10 h-10 rounded-[12px] bg-gray-50 flex items-center justify-center flex-none border border-gray-100 group-hover:border-blue-200 transition-colors">
                                        <Icon className="w-5 h-5 text-gray-500" />
                                    </div>

                                    {/* Info block */}
                                    <div className="flex-1 min-w-0 flex items-center justify-between border-b border-gray-50 pb-3 group-hover:border-blue-100 transition-colors">
                                        <div className="flex flex-col min-w-0 pr-2">
                                            <span className="text-[15px] font-bold text-gray-900 truncate tracking-tight group-hover:text-blue-600 transition-colors">
                                                {item.name}
                                            </span>
                                            <span className="text-[12px] font-medium text-gray-500 truncate mt-0.5">
                                                {item.categoryName} • {item.txCount} {item.txCount === 1 ? 'purchase' : 'purchases'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-[15px] font-bold text-gray-900 flex-none pl-2">
                                                ${item.amount.toFixed(0)}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <MerchantListSheet
                isOpen={isListOpen}
                onClose={() => setIsListOpen(false)}
                transactions={transactions}
                categories={categories}
            />

            <MerchantDetailSheet
                isOpen={selectedMerchant !== null}
                onClose={() => setSelectedMerchant(null)}
                merchantName={selectedMerchant?.name || ''}
                transactions={selectedMerchant ? transactions.filter(t => t.vendor?.trim().toLowerCase() === selectedMerchant.name.trim().toLowerCase()) : []}
                totalAmount={selectedMerchant?.amount || 0}
            />
        </>
    );
}
