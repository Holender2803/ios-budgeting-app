import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Plus, Edit2, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { motion } from 'motion/react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function Categories() {
  const navigate = useNavigate();
  const { categories, vendorRules, addVendorRule, deleteVendorRule, getCategoryById, addCategory } = useExpense();

  const [showAddRule, setShowAddRule] = useState(false);
  const [vendor, setVendor] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id || '');

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddRule = () => {
    if (!vendor || !selectedCategoryId) return;

    addVendorRule({
      vendor,
      categoryId: selectedCategoryId,
    });

    setVendor('');
    setShowAddRule(false);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;

    addCategory({
      name: newCategoryName.trim(),
      icon: 'Tag',
      color: '#8bd',
    });

    setNewCategoryName('');
    setShowAddCategory(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>

            <h1 className="text-xl font-semibold text-gray-900">Categories & Rules</h1>

            <div className="w-10" />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
        {/* Categories List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
            <button
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>

          {/* Add Category Form */}
          {showAddCategory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-2xl p-4 shadow-sm space-y-4 mb-4"
            >
              <div className="space-y-2">
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  type="text"
                  placeholder="e.g., Subscriptions"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="h-12 rounded-xl"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddCategory(false)}
                  className="flex-1 h-12 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="flex-1 h-12 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          )}

          <div className="space-y-2">
            {categories.map((category) => {
              const IconComponent = (LucideIcons as any)[category.icon];

              return (
                <motion.div
                  key={category.id}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}15` }}
                  >
                    {IconComponent && (
                      <IconComponent className="w-6 h-6" style={{ color: category.color }} />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{category.name}</p>
                  </div>

                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Edit2 className="w-4 h-4 text-gray-400" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Vendor Rules */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Vendor Rules</h2>
            <button
              onClick={() => setShowAddRule(!showAddRule)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Rule
            </button>
          </div>

          {/* Add Rule Form */}
          {showAddRule && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-2xl p-4 shadow-sm space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="vendor-pattern">Vendor Name Contains</Label>
                <Input
                  id="vendor-pattern"
                  type="text"
                  placeholder="e.g., Starbucks"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Auto-assign to Category</Label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((category) => {
                    const IconComponent = (LucideIcons as any)[category.icon];
                    const isSelected = category.id === selectedCategoryId;

                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategoryId(category.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isSelected
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? 'bg-white/20' : ''
                            }`}
                          style={{
                            backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${category.color}15`,
                          }}
                        >
                          {IconComponent && (
                            <IconComponent
                              className="w-4 h-4"
                              style={{ color: isSelected ? 'white' : category.color }}
                            />
                          )}
                        </div>
                        <span className={`text-sm ${isSelected ? 'font-medium' : ''}`}>
                          {category.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddRule(false)}
                  className="flex-1 h-12 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRule}
                  disabled={!vendor || !selectedCategoryId}
                  className="flex-1 h-12 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Add Rule
                </button>
              </div>
            </motion.div>
          )}

          {/* Rules List */}
          <div className="space-y-2">
            {vendorRules.length === 0 && !showAddRule && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No vendor rules yet</p>
                <p className="text-xs mt-1">Add rules to auto-categorize expenses</p>
              </div>
            )}

            {vendorRules.map((rule) => {
              const category = categories.find((c) => c.id === rule.categoryId);
              const IconComponent = category ? (LucideIcons as any)[category.icon] : null;

              return (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: category ? `${category.color}15` : '#f3f4f6' }}
                  >
                    {IconComponent && (
                      <IconComponent className="w-5 h-5" style={{ color: category?.color }} />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {rule.vendor}
                    </p>
                    <p className="text-xs text-gray-500">
                      → {category?.name}
                    </p>
                  </div>

                  <button
                    onClick={() => deleteVendorRule(rule.id)}
                    className="p-2 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}