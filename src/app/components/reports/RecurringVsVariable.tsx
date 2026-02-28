import { useMemo } from 'react';
import { Transaction } from '../../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useExpense } from '../../context/ExpenseContext';

interface RecurringVsVariableProps {
    transactions: Transaction[];
}

export function RecurringVsVariable({ transactions }: RecurringVsVariableProps) {
    const { includeRecurring } = useExpense();

    const { recurring, variable, total } = useMemo(() => {
        let rec = 0;
        let varAmt = 0;

        transactions.forEach(t => {
            if (t.isRecurring) {
                rec += t.amount;
            } else {
                varAmt += t.amount;
            }
        });

        return { recurring: rec, variable: varAmt, total: rec + varAmt };
    }, [transactions]);

    const isGreyedOut = !includeRecurring;

    const data = [
        { name: 'One-off', value: variable, color: '#3B82F6' }, // Solid blue
        { name: 'Recurring', value: recurring, color: '#93C5FD' } // Light blue
    ];

    return (
        <div className={`bg-white p-5 rounded-[16px] shadow-sm flex flex-col w-full font-dm-sans transition-opacity ${isGreyedOut ? 'opacity-50 grayscale' : ''}`}>
            <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                Recurring vs One-off
            </h3>

            {isGreyedOut ? (
                <div className="flex flex-col items-center justify-center min-h-[120px] text-center">
                    <p className="text-sm font-bold text-gray-500 mb-1">Hidden by toggle</p>
                    <p className="text-xs text-gray-400">All recurring expenses have been excluded.</p>
                </div>
            ) : total === 0 ? (
                <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No data for this period.</p>
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    <div className="relative w-[120px] h-[120px] flex-none">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={56}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Total</span>
                            <span className="text-sm font-bold text-gray-900">${total.toFixed(0)}</span>
                        </div>
                    </div>

                    <div className="flex-1 pl-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                <span className="text-sm font-bold text-gray-700">One-off</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">${variable.toFixed(0)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-300" />
                                <span className="text-sm font-bold text-gray-700">Recurring</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">${recurring.toFixed(0)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
