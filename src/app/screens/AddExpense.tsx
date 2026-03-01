import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { useVendorSuggestions } from '../hooks/useVendorSuggestions';
import { CategoryPicker } from '../components/category/CategoryPicker';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ReceiptAttachmentField } from '../components/receipt/ReceiptAttachmentField';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { readReceiptFileAsDataUrl, ReceiptFileValidationError, validateReceiptFile } from '../utils/receiptExtractionService';

const RECURRENCE_OPTIONS = ['daily', 'weekly', 'monthly', 'yearly'] as const;

export function AddExpense() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addTransaction, categories, addVendorRule, getSuggestedCategory, selectedDate } = useExpense();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState(location.state?.vendor || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [date, setDate] = useState(selectedDate);
  const [note, setNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<typeof RECURRENCE_OPTIONS[number]>('monthly');
  const [endDate, setEndDate] = useState('');
  const [categorySource, setCategorySource] = useState<'manual' | 'suggestion'>('manual');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userTouchedCategory, setUserTouchedCategory] = useState(false);

  const { suggestions: filteredSuggestions } = useVendorSuggestions(vendor);

  // Auto-apply suggested category
  useEffect(() => {
    if (userTouchedCategory) return;

    const suggestion = getSuggestedCategory(vendor);
    if (suggestion && suggestion !== categoryId) {
      setCategoryId(suggestion);
      setCategorySource('suggestion');
    }
  }, [vendor, getSuggestedCategory, categoryId, userTouchedCategory]);

  // Ensure page is scrolled to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleVendorChange = (newVendor: string) => {
    setVendor(newVendor);
    if (!newVendor.trim()) {
      setCategorySource('manual');
      setShowSuggestions(false);
    } else {
      setShowSuggestions(true);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setVendor(suggestion);
    setShowSuggestions(false);
  };

  const handleCategorySelect = (id: string, source: 'manual' | 'suggestion' = 'manual') => {
    setCategoryId(id);
    setCategorySource(source);
    if (source === 'manual') {
      setUserTouchedCategory(true);
    }
    if (source === 'suggestion') {
      toast.success('✨ Category applied', { duration: 1500 });
    }
  };

  const handleReceiptSelected = async (file: File) => {
    try {
      validateReceiptFile(file);
    } catch (error) {
      if (error instanceof ReceiptFileValidationError) {
        toast.error(error.message);
      }
      return;
    }

    const nextPhotoUrl = await readReceiptFileAsDataUrl(file);
    setPhotoUrl(nextPhotoUrl);
    toast.success('Receipt attached');
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
      photoUrl: photoUrl || undefined,
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

            <div className="w-10" />
          </div>
        </div>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto px-4 py-6 space-y-6"
      >
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void handleReceiptSelected(file);
            event.target.value = '';
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void handleReceiptSelected(file);
            event.target.value = '';
          }}
        />

        {/* Vendor */}
        <div className="space-y-2 relative" ref={dropdownRef}>
          <Label htmlFor="vendor">Vendor</Label>
          <Input
            id="vendor"
            type="text"
            placeholder="Where did you spend?"
            value={vendor}
            onChange={(e) => handleVendorChange(e.target.value)}
            onFocus={() => vendor.trim() && setShowSuggestions(true)}
            onBlur={() => {
              // Delay to allow clicking on suggestion
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            className="h-14 rounded-2xl text-base shadow-sm border-gray-100 focus:border-blue-500 transition-all"
            autoComplete="off"
          />

          <AnimatePresence>
            {showSuggestions && filteredSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
              >
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center justify-between group"
                  >
                    <span className="text-gray-700 font-medium">{suggestion}</span>
                    <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-blue-400 rotate-180" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
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
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              {RECURRENCE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRecurrenceType(option)}
                  className={`py-2 text-sm font-medium rounded-lg transition-colors ${recurrenceType === option
                    ? 'bg-black text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {option[0].toUpperCase() + option.slice(1)}
                </button>
              ))}
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

        <ReceiptAttachmentField
          photoUrl={photoUrl}
          onTakePhoto={() => cameraInputRef.current?.click()}
          onUpload={() => galleryInputRef.current?.click()}
        />

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
