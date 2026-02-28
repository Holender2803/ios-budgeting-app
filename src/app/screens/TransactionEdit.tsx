import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, Trash2, Repeat } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { CategoryPicker } from '../components/category/CategoryPicker';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export function TransactionEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    transactions,
    updateTransaction,
    updateRecurringRule,
    deleteTransaction,
    categories,
    addVendorRule,
    isHydrated
  } = useExpense();

  // Robust ID lookup for both standard UUIDs and virtual recurring IDs (e.g., uuid-2026-02-21)
  const transaction = transactions.find((t) => {
    if (t.id === id) return true;
    // Check if the current id is a virtual child of this transaction
    if (id?.startsWith(`${t.id}-`)) return true;
    return false;
  });

  const [vendor, setVendor] = useState(transaction?.vendor || '');
  const [amount, setAmount] = useState(transaction?.amount.toString() || '');
  const [categoryId, setCategoryId] = useState(transaction?.category || '');
  const [date, setDate] = useState(transaction?.date || '');
  const [note, setNote] = useState(transaction?.note || '');
  const [isRecurring, setIsRecurring] = useState(transaction?.isRecurring || false);
  const [recurrenceType, setRecurrenceType] = useState<'weekly' | 'monthly'>(transaction?.recurrenceType || 'monthly');
  const [endDate, setEndDate] = useState(transaction?.endDate || '');
  const [categorySource, setCategorySource] = useState<'manual' | 'suggestion'>('manual');

  // 3. Keep local state in sync if transaction changes (important for async hydration/updates)
  useEffect(() => {
    if (transaction) {
      setVendor(transaction.vendor);
      setAmount(transaction.amount.toString());
      setCategoryId(transaction.category);
      setDate(transaction.date);
      setNote(transaction.note || '');
      setIsRecurring(transaction.isRecurring || false);
      setRecurrenceType(transaction.recurrenceType || 'monthly');
      setEndDate(transaction.endDate || '');
    }
  }, [transaction]);

  // 1. Wait for hydration
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    );
  }

  // 2. Handle missing transaction with a proper UI instead of blank/redirect
  if (!transaction) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-sm w-full space-y-4">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-8 h-8 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Transaction not found</h2>
          <p className="text-gray-500 text-sm">
            This transaction may have been deleted or is still being synchronized from the cloud.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            Go back home
          </button>
        </div>
      </div>
    );
  }

  const handleVendorChange = (newVendor: string) => {
    setVendor(newVendor);
    if (!newVendor.trim()) {
      setCategorySource('manual');
    }
  };

  const handleCategorySelect = (id: string, source?: 'manual' | 'suggestion') => {
    setCategoryId(id);
    setCategorySource(source || 'manual');
    if (source === 'suggestion') {
      toast.success('✨ Category applied', { duration: 1500 });
    }
  };

  const handleSave = () => {
    if (!vendor || !amount || !categoryId || !id) {
      return;
    }

    const updateFn = isRecurring ? updateRecurringRule : updateTransaction;

    updateFn(id, {
      vendor,
      amount: parseFloat(amount),
      category: categoryId,
      date,
      note: note || undefined,
      isRecurring,
      recurrenceType: isRecurring ? recurrenceType : undefined,
      endDate: isRecurring && endDate ? endDate : undefined,
    });

    if (categorySource === 'suggestion') {
      // Auto-create rule if suggested category was applied
      addVendorRule({
        vendorContains: vendor.trim(),
        categoryId,
      });
    }

    navigate(`/day/${date}`);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      await deleteTransaction(id!);
      navigate(`/day/${transaction.date}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>

            <h1 className="text-xl font-semibold text-gray-900">Edit Expense</h1>

            <button
              type="button"
              onClick={handleDelete}
              className="p-2 hover:bg-red-50 rounded-full transition-colors relative z-20"
              aria-label="Delete expense"
            >
              <Trash2 className="w-6 h-6 text-red-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto px-4 py-6 space-y-6"
      >
        {/* Photo Preview */}
        {transaction.photoUrl && (
          <div className="w-full max-w-xs mx-auto rounded-2xl overflow-hidden shadow-lg">
            <img src={transaction.photoUrl} alt="Receipt" className="w-full h-auto" />
          </div>
        )}

        {/* Vendor */}
        <div className="space-y-2">
          <Label htmlFor="vendor">Vendor</Label>
          <Input
            id="vendor"
            type="text"
            placeholder="Where did you spend?"
            value={vendor}
            onChange={(e) => handleVendorChange(e.target.value)}
            className="h-14 rounded-2xl text-base shadow-sm border-gray-100 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
              $
            </span>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-14 rounded-2xl text-base pl-8 shadow-sm border-gray-100 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Category Tiered Selection */}
        <div className="space-y-3">
          <Label className="text-gray-900 font-bold ml-1">Category</Label>
          <CategoryPicker
            selectedCategoryId={categoryId}
            onSelect={handleCategorySelect}
            vendor={vendor}
          />
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-14 rounded-2xl text-base shadow-sm border-gray-100 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Recurring Expense Integration */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-gray-900 font-medium block">Recurring Expense</Label>
              <span className="text-xs text-gray-500">Separate fixed costs from daily spending</span>
            </div>
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${isRecurring ? 'bg-black' : 'bg-gray-200'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isRecurring ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>

          {isRecurring && (
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRecurrenceType('weekly')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${recurrenceType === 'weekly'
                  ? 'bg-black text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setRecurrenceType('monthly')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${recurrenceType === 'monthly'
                  ? 'bg-black text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
              >
                Monthly
              </button>
            </div>
          )}

          {isRecurring && (
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="endDate" className="text-xs font-semibold uppercase tracking-wider text-gray-400">Optional End Date</Label>
                {endDate && (
                  <button
                    type="button"
                    onClick={() => setEndDate('')}
                    className="text-[10px] font-bold text-red-500 uppercase tracking-tight hover:text-red-600 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-14 rounded-2xl text-base border-gray-100 focus:border-black transition-colors"
              />
            </div>
          )}
        </div>

        {/* Note */}
        <div className="space-y-2">
          <Label htmlFor="note">Note (Optional)</Label>
          <Textarea
            id="note"
            placeholder="Add a note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-2xl text-base min-h-[100px]"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!vendor || !amount || !categoryId}
          className="w-full h-14 bg-blue-500 text-white rounded-2xl font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          Save Changes
        </button>
      </motion.div>
    </div>
  );
}