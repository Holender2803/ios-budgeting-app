import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Upload, Loader2, Check } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { CategorySelector } from '../components/CategorySelector';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

type UploadState = 'upload' | 'processing' | 'review';

export function ReceiptUpload() {
  const navigate = useNavigate();
  const { addTransaction, categories, getSuggestedCategory } = useExpense();

  const [uploadState, setUploadState] = useState<UploadState>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Extracted fields (simulated AI extraction)
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [categorySource, setCategorySource] = useState<'manual' | 'rule'>('manual');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Simulate AI processing
      setUploadState('processing');
      setTimeout(() => {
        // Mock AI extraction
        const extractedVendor = 'Starbucks Coffee';
        setVendor(extractedVendor);
        setAmount('12.50');
        setDate(format(new Date(), 'yyyy-MM-dd'));

        // Check for rules first
        const autoCategory = getSuggestedCategory(extractedVendor);
        if (autoCategory) {
          setCategoryId(autoCategory);
          setCategorySource('rule');
        } else {
          setCategoryId(categories.find(c => c.name === 'Coffee')?.id || categories[0]?.id);
          setCategorySource('manual');
        }

        setUploadState('review');
      }, 2000);
    }
  };

  const handleConfirm = () => {
    if (!vendor || !amount || !categoryId) {
      return;
    }

    addTransaction({
      vendor,
      amount: parseFloat(amount),
      category: categoryId,
      date,
      photoUrl: previewUrl,
    });

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

            <h1 className="text-xl font-semibold text-gray-900">Upload Receipt</h1>

            <div className="w-10" />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Upload State */}
          {uploadState === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <label
                htmlFor="receipt-upload"
                className="flex flex-col items-center justify-center w-full h-80 bg-white border-2 border-dashed border-gray-300 rounded-3xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              >
                <div className="flex flex-col items-center">
                  <Upload className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Upload Receipt Photo
                  </p>
                  <p className="text-sm text-gray-500">
                    We'll extract the details for you
                  </p>
                </div>
                <input
                  id="receipt-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </motion.div>
          )}

          {/* Processing State */}
          {uploadState === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-16"
            >
              {previewUrl && (
                <div className="mb-8 w-full max-w-xs rounded-3xl overflow-hidden shadow-lg">
                  <img src={previewUrl} alt="Receipt" className="w-full h-auto" />
                </div>
              )}

              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Processing Receipt
              </p>
              <p className="text-sm text-gray-500">
                Extracting transaction details...
              </p>
            </motion.div>
          )}

          {/* Review State */}
          {uploadState === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Success indicator */}
              <div className="flex items-center justify-center gap-3 bg-green-50 text-green-700 py-4 px-6 rounded-2xl">
                <Check className="w-5 h-5" />
                <span className="font-medium">Details extracted successfully</span>
              </div>

              {/* Preview image */}
              {previewUrl && (
                <div className="w-full max-w-xs mx-auto rounded-3xl overflow-hidden shadow-lg">
                  <img src={previewUrl} alt="Receipt" className="w-full h-auto" />
                </div>
              )}

              {/* Editable fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor</Label>
                  <Input
                    id="vendor"
                    type="text"
                    value={vendor}
                    onChange={(e) => {
                      const newVendor = e.target.value;
                      setVendor(newVendor);
                      const autoCategory = getSuggestedCategory(newVendor);
                      if (autoCategory) {
                        setCategoryId(autoCategory);
                        setCategorySource('rule');
                      } else {
                        setCategorySource('manual');
                      }
                    }}
                    className="h-14 rounded-2xl text-base"
                  />
                </div>

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
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-14 rounded-2xl text-base pl-8"
                    />
                  </div>
                </div>

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

                <div className="space-y-3">
                  <Label>Category</Label>
                  <div className="space-y-1">
                    <CategorySelector
                      selectedCategoryId={categoryId}
                      onSelect={(id) => { setCategoryId(id); setCategorySource('manual'); }}
                    />
                    {categorySource === 'rule' && (
                      <p className="text-xs text-blue-500 font-medium px-2 py-1 bg-blue-50/50 rounded inline-block">
                        ✨ Auto-categorized by rule
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                disabled={!vendor || !amount || !categoryId}
                className="w-full h-14 bg-blue-500 text-white rounded-2xl font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg"
              >
                Confirm & Save
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
