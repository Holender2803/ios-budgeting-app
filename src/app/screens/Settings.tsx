import { useNavigate } from 'react-router';
import { ChevronRight, Bell, Calendar, Shield, Tag, ChevronLeft, Filter, Repeat, Trash2, StopCircle } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { format, parseISO } from 'date-fns';
import { Switch } from '../components/ui/switch';
import { BottomNav } from '../components/BottomNav';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export function Settings() {
  const navigate = useNavigate();
  const { settings, updateSettings, categories, getCategoryById, transactions, stopRecurringRule } = useExpense();

  const activeRecurringRules = transactions.filter(t => t.isRecurring && t.isActive !== false);

  const clearDefaultFilter = () => {
    updateSettings({ defaultCategoryFilter: undefined });
    toast.success('Default filter cleared');
  };

  const defaultFilterCategories = settings.defaultCategoryFilter?.map(id => getCategoryById(id)?.name).filter(Boolean).join(', ');

  const settingsItems = [
    {
      icon: Bell,
      label: 'Notifications',
      description: 'Daily spending reminders',
      value: settings.notifications,
      onChange: (value: boolean) => updateSettings({ notifications: value }),
      type: 'toggle' as const,
    },
    {
      icon: Calendar,
      label: 'Google Calendar Sync',
      description: 'Sync expenses to calendar',
      value: settings.googleCalendarSync,
      onChange: (value: boolean) => updateSettings({ googleCalendarSync: value }),
      type: 'toggle' as const,
    },
    {
      icon: Repeat,
      label: 'Recurring Payments',
      description: 'Manage subscriptions & bills',
      type: 'link' as const,
      path: '/settings/recurring',
    },
    {
      icon: Tag,
      label: 'Categories & Rules',
      description: 'Manage spending categories',
      type: 'link' as const,
      path: '/categories',
    },
    {
      icon: Shield,
      label: 'Privacy',
      description: 'Your data stays on your device',
      type: 'info' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-6">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Settings List */}
        <div className="space-y-2">
          {settingsItems.map((item, index) => {
            const IconComponent = item.icon;

            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {item.type === 'toggle' ? (
                  <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-blue-500" />
                    </div>

                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>

                    <Switch
                      checked={item.value}
                      onCheckedChange={item.onChange}
                    />
                  </div>
                ) : item.type === 'link' ? (
                  <button
                    onClick={() => navigate(item.path!)}
                    className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-blue-500" />
                    </div>

                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ) : (
                  <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-green-500" />
                    </div>

                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>


        {/* Default Category Filter */}
        {settings.defaultCategoryFilter && settings.defaultCategoryFilter.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <h3 className="font-medium text-blue-900 mb-2">Default Category Filter</h3>
            <p className="text-sm text-blue-700 leading-relaxed mb-3">
              Currently filtering by: {defaultFilterCategories}
            </p>
            <button
              onClick={clearDefaultFilter}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
          <h3 className="font-medium text-green-900 mb-2">Your Privacy Matters</h3>
          <p className="text-sm text-green-700 leading-relaxed">
            All your expense data is stored locally on your device. We don't collect, store,
            or share any of your financial information.
          </p>
        </div>

        {/* App Info */}
        <div className="text-center text-sm text-gray-500 pt-8">
          <p>CalendarSpent v1.0</p>
          <p className="mt-1">A mirror, not a coach</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}