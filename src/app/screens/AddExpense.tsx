import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { format } from 'date-fns';
import { ChevronLeft, Camera, FileText } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { CategorySelector } from '../components/CategorySelector';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export function AddExpense() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addTransaction, categories, transactions, vendorRules, addVendorRule, getSuggestedCategory } = useExpense();

  const presetDate = (location.state as any)?.date || format(new Date(), 'yyyy-MM-dd');

  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [date, setDate] = useState(presetDate);
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'weekly' | 'monthly'>('monthly');
  const [showRuleSuggestion, setShowRuleSuggestion] = useState(false);
  const [categorySource, setCategorySource] = useState<'manual' | 'rule'>('manual');

  // Check if we should auto-assign or suggest a rule
  const handleVendorChange = (newVendor: string) => {
    setVendor(newVendor);

    if (newVendor.trim()) {
      // 1. Auto-assign based on rules
      const autoCategory = getSuggestedCategory(newVendor);
      if (autoCategory) {
        setCategoryId(autoCategory);
        setCategorySource('rule');
        setShowRuleSuggestion(false);
        return;
      }

      setCategorySource('manual');
      // 2. Otherwise suggest rule if vendor appears 2+ times
      const vendorTransactions = transactions.filter(
        t => t.vendor.toLowerCase() === newVendor.toLowerCase()
      );
      setShowRuleSuggestion(vendorTransactions.length >= 2);
    } else {
      setCategorySource('manual');
      setShowRuleSuggestion(false);
    }
  };

  const handleCreateRule = () => {
    if (vendor && categoryId) {
      addVendorRule({
        vendor: vendor.trim(),
        categoryId,
      });
      setShowRuleSuggestion(false);
    }
  };

  const handleSave = () => {
    if (!vendor || !amount || !categoryId) {
      return;
    }

    addTransaction({
      vendor,
      amount: parseFloat(amount),
      category: categoryId,
      date,
      note: note || undefined,
      isRecurring,
      recurrenceType: isRecurring ? recurrenceType : undefined,
    });

    if (categorySource === 'rule') {
      toast.success('✨ Auto-categorized', { duration: 2000 });
    }

    navigate(`/day/${date}`);
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

            <h1 className="text-xl font-semibold text-gray-900">Add Expense</h1>

            <button
              onClick={() => navigate('/receipt-upload')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Camera className="w-6 h-6 text-gray-600" />
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
        {/* Vendor */}
        <div className="space-y-2">
          <Label htmlFor="vendor">Vendor</Label>
          <Input
            id="vendor"
            type="text"
            placeholder="Where did you spend?"
            value={vendor}
            onChange={(e) => handleVendorChange(e.target.value)}
            className="h-14 rounded-2xl text-base"
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
              className="h-14 rounded-2xl text-base pl-8"
            />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-3">
          <Label>Category</Label>
          <div className="space-y-1">
            <CategorySelector selectedCategoryId={categoryId} onSelect={(id) => { setCategoryId(id); setCategorySource('manual'); }} />
            {categorySource === 'rule' && (
              <p className="text-xs text-blue-500 font-medium px-2 py-1 bg-blue-50/50 rounded inline-block">
                ✨ Auto-categorized by rule
              </p>
            )}
          </div>

          {/* Rule Suggestion - Inline */}
          {showRuleSuggestion && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-3"
            >
              <div className="flex-1">
                <p className="text-sm text-blue-900">
                  Always categorize <span className="font-medium">{vendor}</span> as{' '}
                  <span className="font-medium">{categories.find(c => c.id === categoryId)?.name}</span>?
                </p>
              </div>
              <button
                onClick={handleCreateRule}
                className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full font-medium hover:bg-blue-600 transition-colors whitespace-nowrap"
              >
                Create Rule
              </button>
            </motion.div>
          )}
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-14 rounded-2xl text-base"
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
          Save Expense
        </button>
      </motion.div>
    </div>
  );
}