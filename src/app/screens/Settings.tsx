import { useNavigate } from 'react-router';
import { ChevronRight, Bell, Calendar, Shield, Tag, ChevronLeft, Filter, Repeat, Trash2, StopCircle, User as UserIcon, LogOut, Cloud } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { format, parseISO } from 'date-fns';
import { Switch } from '../components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { BottomNav } from '../components/BottomNav';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';
import { useState } from 'react';

export function Settings() {
  const navigate = useNavigate();
  const { user, supabaseConfigured, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const {
    settings,
    updateSettings,
    categories,
    getCategoryById,
    transactions,
    stopRecurringRule,
    exportBackup,
    importBackup,
    clearAllData
  } = useExpense();

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
    <div className="h-[100dvh] flex flex-col bg-gray-50 overflow-hidden">
      {/* Header (Frozen) */}
      <div className="flex-none bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-6">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-10">
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

          {/* Account & Cloud Sync */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-medium text-gray-900 mb-4 px-2">Account & Sync</h3>
            <div className="space-y-4">
              {/* Cloud Status Indicator */}
              <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!supabaseConfigured ? 'bg-gray-200' :
                    user ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                  <Cloud className={`w-4 h-4 ${!supabaseConfigured ? 'text-gray-500' :
                      user ? 'text-green-600' : 'text-blue-600'
                    }`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Cloud status</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {!supabaseConfigured
                      ? "Local-only. Supabase not configured."
                      : user
                        ? `Signed in as ${user.email}`
                        : "Configured but signed out."}
                  </p>
                </div>
              </div>

              {/* Sync Placeholders */}
              {supabaseConfigured && user && (
                <div className="px-2 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Sync Status</span>
                    <span className="font-medium text-gray-900">Disabled (TODO)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Last Sync</span>
                    <span className="font-medium text-gray-900">Never (TODO)</span>
                  </div>
                </div>
              )}

              {/* Auth Actions */}
              {supabaseConfigured && (
                <div className="pt-2">
                  {user ? (
                    <button
                      onClick={() => signOut()}
                      className="w-full bg-red-50 hover:bg-red-100 rounded-xl p-4 flex items-center justify-between transition-colors border border-red-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                          <LogOut className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-red-700 text-sm">Sign out</p>
                        </div>
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => setAuthModalOpen(true)}
                      className="w-full bg-blue-50 hover:bg-blue-100 rounded-xl p-4 flex items-center justify-between transition-colors border border-blue-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-blue-700 text-sm">Sign in / Create account</p>
                          <p className="text-xs text-blue-500">Enable cloud backups and sync</p>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
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

          {/* Backup & Restore */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-medium text-gray-900 mb-4 px-2">Backup & Restore</h3>
            <div className="space-y-2">
              <button
                onClick={exportBackup}
                className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-4 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 text-sm">Export data</p>
                    <p className="text-xs text-gray-500">Download a backup file</p>
                  </div>
                </div>
              </button>

              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      const content = event.target?.result;
                      if (typeof content === 'string') {
                        await importBackup(content);
                      }
                      // Reset value so the same file can be selected again
                      if (e.target) e.target.value = '';
                    };
                    reader.readAsText(file);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button
                  className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-4 flex items-center justify-between transition-colors pointer-events-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Tag className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900 text-sm">Import data</p>
                      <p className="text-xs text-gray-500">Restore from a backup file</p>
                    </div>
                  </div>
                </button>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="w-full bg-red-50 hover:bg-red-100 rounded-xl p-4 flex items-center justify-between transition-colors mt-4 border border-red-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-red-700 text-sm">Clear local data</p>
                        <p className="text-xs text-red-500">Delete all data on this device</p>
                      </div>
                    </div>
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl p-6">
                  <AlertDialogHeader className="text-left space-y-3">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2 mx-auto">
                      <Trash2 className="w-6 h-6 text-red-600" />
                    </div>
                    <AlertDialogTitle className="text-xl text-center">Delete all data?</AlertDialogTitle>
                    <AlertDialogDescription className="text-base text-center">
                      This will delete all local data on this device. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex gap-3 mt-8">
                    <AlertDialogCancel className="w-1/2 flex-1 rounded-xl h-12 m-0 bg-gray-100 hover:bg-gray-200 border-0 font-medium text-gray-900">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clearAllData()}
                      className="w-1/2 flex-1 rounded-xl h-12 m-0 bg-red-600 hover:bg-red-700 font-medium text-white shadow-none"
                    >
                      Delete
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
            <h3 className="font-medium text-green-900 mb-2">Your Privacy Matters</h3>
            <p className="text-sm text-green-700 leading-relaxed">
              All your expense data is stored locally on your device. We don't collect, store,
              or share any of your financial information.
            </p>
          </div>

          {/* App Info */}
          <div className="text-center text-sm text-gray-500 pt-8 pb-4">
            <p>CalendarSpent v1.0</p>
            <p className="mt-1">A mirror, not a coach</p>
          </div>
        </div>
      </div>

      <BottomNav />

      {/* Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
      />
    </div>
  );
}