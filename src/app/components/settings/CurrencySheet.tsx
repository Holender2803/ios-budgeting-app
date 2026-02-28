import { Drawer } from 'vaul';
import { Check } from 'lucide-react';

interface CurrencySheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCurrency: string;
    onSelect: (currency: string) => void;
}

const CURRENCIES = [
    { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
    { code: 'ILS', name: 'Israeli New Shekel', symbol: '₪' },
];

export function CurrencySheet({ open, onOpenChange, selectedCurrency, onSelect }: CurrencySheetProps) {
    return (
        <Drawer.Root open={open} onOpenChange={onOpenChange}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 outline-none">
                    <div className="bg-white rounded-t-2xl max-w-lg mx-auto w-full">
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 rounded-full bg-gray-300" />
                        </div>

                        <div className="px-5 pb-2">
                            <h3 className="text-lg font-semibold text-gray-900">Select Currency</h3>
                        </div>

                        <div className="px-3 pb-8">
                            {CURRENCIES.map((currency) => (
                                <button
                                    key={currency.code}
                                    onClick={() => {
                                        onSelect(currency.code);
                                        onOpenChange(false);
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg w-6 text-center">{currency.symbol}</span>
                                        <div className="text-left">
                                            <p className="text-[15px] font-medium text-gray-900">{currency.code}</p>
                                            <p className="text-xs text-gray-500">{currency.name}</p>
                                        </div>
                                    </div>
                                    {selectedCurrency === currency.code && (
                                        <Check className="w-5 h-5 text-blue-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}

export { CURRENCIES };
