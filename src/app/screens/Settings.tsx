import { useNavigate } from 'react-router';
import { ChevronRight, RefreshCw, Unplug, AlertCircle } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { format } from 'date-fns';
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
import { useState, useMemo, useRef } from 'react';
import { CurrencySheet, CURRENCIES } from '../components/settings/CurrencySheet';
import { ExportSheet } from '../components/settings/ExportSheet';
import { AccountSheet } from '../components/settings/AccountSheet';
import { SpreadsheetImportSheet } from '../components/settings/SpreadsheetImportSheet';
import { downloadSpreadsheetTemplate, parseSpreadsheetFile, SpreadsheetImportSummary, SpreadsheetImportValidationError } from '../utils/spreadsheetImport';

// ─── Reusable Row Component ───────────────────────────────────────────────────
interface SettingsRowProps {
  icon: string;
  iconBg: string;
  label: string;
  labelClassName?: string;
  sub?: React.ReactNode;
  subClassName?: string;
  badge?: string | number;
  right?: React.ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
  isLast?: boolean;
}

function SettingsRow({ icon, iconBg, label, labelClassName, sub, subClassName, badge, right, onClick, showChevron = true, isLast = false }: SettingsRowProps) {
  return (
    <>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3 min-h-[56px] hover:bg-gray-50/50 transition-colors text-left"
      >
        {/* Icon */}
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0 text-base"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>

        {/* Label + Sub */}
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] font-medium ${labelClassName || 'text-gray-900'}`}>{label}</p>
          {sub && <p className={`text-xs text-gray-500 ${subClassName || ''}`}>{sub}</p>}
        </div>

        {/* Right side */}
        {badge !== undefined && (
          <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        {right}
        {showChevron && (
          <ChevronRight className="w-4.5 h-4.5 text-gray-400 shrink-0" />
        )}
      </button>
      {!isLast && <div className="mx-4 border-b border-[#F1F5F9]" />}
    </>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={`text-[11px] font-medium uppercase tracking-[0.6px] mb-2 pl-1 ${className || 'text-[#64748B]'}`}
    >
      {children}
    </p>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[16px] border border-[#E2E8F0] overflow-hidden">
      {children}
    </div>
  );
}

// ─── Main Settings Component ──────────────────────────────────────────────────
export function Settings() {
  const navigate = useNavigate();
  const {
    user,
    supabaseConfigured,
    calendarStatus,
    calendarStatusLoading,
    connectGoogleCalendar,
    disconnectGoogleCalendar: doDisconnect,
    syncCalendar,
    isSyncingCalendar,
  } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [calendarConnecting, setCalendarConnecting] = useState(false);
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [spreadsheetImportOpen, setSpreadsheetImportOpen] = useState(false);
  const [isImportingSpreadsheet, setIsImportingSpreadsheet] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatusText, setImportStatusText] = useState('Preparing import');
  const [importSummary, setImportSummary] = useState<SpreadsheetImportSummary | null>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const {
    settings,
    updateSettings,
    transactions,
    categories,
    exportBackup,
    importBackup,
    importSpreadsheet,
    clearAllData,
    buildCalendarPayload,
  } = useExpense();

  // Count active recurring expenses
  const recurringCount = useMemo(() => {
    return transactions.filter(t => t.isRecurring && !t.isVirtual && t.isActive !== false && !t.deletedAt).length;
  }, [transactions]);

  // Currency display
  const selectedCurrency = settings.currency || 'CAD';
  const currencyInfo = CURRENCIES.find(c => c.code === selectedCurrency);
  const currencyDisplay = currencyInfo ? `${currencyInfo.code} · ${currencyInfo.name}` : selectedCurrency;

  // Notifications display
  const notifStatus = settings.notifications ? 'Daily reminders · On' : 'All notifications off';

  // Sync status display
  const lastSyncDisplay = settings.lastPullAt
    ? format(new Date(settings.lastPullAt), 'MMM d, h:mm a')
    : 'Never';

  // User display
  const userEmail = user?.email || '';
  const userName = user?.user_metadata?.full_name || userEmail.split('@')[0] || '';
  const userInitial = (userName[0] || '?').toUpperCase();

  // CSV export
  const exportCSV = () => {
    try {
      const activeTransactions = transactions.filter(t => !t.deletedAt && !t.isVirtual);
      if (activeTransactions.length === 0) {
        toast.error('No expenses to export');
        return;
      }

      const headers = ['Date', 'Vendor', 'Amount', 'Category', 'Note', 'Recurring'];
      const rows = activeTransactions.map(t => {
        const cat = categories.find(c => c.id === t.category);
        return [
          t.date,
          `"${t.vendor.replace(/"/g, '""')}"`,
          t.amount.toFixed(2),
          `"${(cat?.name || t.category).replace(/"/g, '""')}"`,
          `"${(t.note || '').replace(/"/g, '""')}"`,
          t.isRecurring ? 'Yes' : 'No',
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `calendarspent-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('CSV export failed:', error);
      toast.error('Failed to export CSV');
    }
  };

  const handleJSONImport = async (file: File) => {
    try {
      const content = await file.text();
      await importBackup(content);
    } finally {
      if (jsonInputRef.current) {
        jsonInputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadSpreadsheetTemplate();
      toast.success('Excel template downloaded');
    } catch (error) {
      console.error('Template download failed:', error);
      toast.error('Failed to generate the Excel template');
    }
  };

  const handleSpreadsheetImport = async (file: File) => {
    setImportSummary(null);
    setIsImportingSpreadsheet(true);
    setImportProgress(10);
    setImportStatusText('Validating spreadsheet');

    try {
      const parsed = await parseSpreadsheetFile(file);
      setImportProgress(25);
      setImportStatusText('Preparing records');

      const summary = await importSpreadsheet(parsed, (message, percent) => {
        setImportStatusText(message);
        setImportProgress(percent);
      });

      setImportSummary(summary);
      toast.success(`Imported ${summary.expenses} expenses, ${summary.categories} categories, ${summary.recurring} recurring items`);
    } catch (error) {
      console.error('Spreadsheet import failed:', error);
      if (error instanceof SpreadsheetImportValidationError) {
        toast.error(error.message, { duration: 6000 });
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to import spreadsheet');
      }
    } finally {
      setIsImportingSpreadsheet(false);
      setImportProgress(0);
    }
  };

  return (
    <div className="app-screen-with-nav h-[100dvh] flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="flex-none bg-white border-b border-gray-200">
        <div className="app-shell-narrow py-6">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="app-shell-narrow py-6 space-y-6 pb-10">

          {/* ═══ PROFILE CARD ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.0 }}
          >
            <button
              onClick={() => {
                if (user) {
                  setAccountSheetOpen(true);
                } else {
                  setAuthModalOpen(true);
                }
              }}
              className="w-full bg-white rounded-[16px] border border-[#E2E8F0] p-4 flex items-center gap-3.5 hover:bg-gray-50/50 transition-colors text-left"
            >
              {/* Avatar */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #2563EB, #8B5CF6)' }}
              >
                <span className="text-white text-lg font-bold">{userInitial}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-gray-900 truncate">
                  {user ? userName : 'Sign In'}
                </p>
                {user ? (
                  <>
                    <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-[11px] text-gray-400">Synced · {lastSyncDisplay}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">Sign in to enable cloud backup</p>
                )}
              </div>

              <ChevronRight className="w-4.5 h-4.5 text-gray-400 shrink-0" />
            </button>
          </motion.div>


          {/* ═══ SPENDING ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <SectionLabel>Spending</SectionLabel>
            <SectionCard>
              <SettingsRow
                icon="📂"
                iconBg="#EEF2FF"
                label="Categories & Rules"
                sub="Manage and auto-assign categories"
                onClick={() => navigate('/categories')}
              />
              <SettingsRow
                icon="🔁"
                iconBg="#FEF3C7"
                label="Recurring Payments"
                sub="Subscriptions & fixed bills"
                badge={recurringCount > 0 ? recurringCount : undefined}
                onClick={() => navigate('/settings/recurring')}
              />
              <SettingsRow
                icon="🎯"
                iconBg="#D1FAE5"
                label="Budget Settings"
                sub="Set monthly limits per category"
                onClick={() => navigate('/settings/budgets')}
              />
              <SettingsRow
                icon="💱"
                iconBg="#EDE9FE"
                label="Currency"
                sub={currencyDisplay}
                onClick={() => setCurrencySheetOpen(true)}
                isLast
              />
            </SectionCard>
          </motion.div>


          {/* ═══ INTEGRATIONS ═══ */}
          {supabaseConfigured && user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <SectionLabel>Integrations</SectionLabel>
              <SectionCard>
                {/* Row */}
                <div className="flex items-center gap-3 px-4 py-3 min-h-[56px]">
                  <div
                    className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0 text-base"
                    style={{ backgroundColor: '#DBEAFE' }}
                  >
                    📅
                  </div>
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => {
                      if (calendarStatus?.connected) {
                        setCalendarExpanded(prev => !prev);
                      } else {
                        // Connect flow
                        (async () => {
                          setCalendarConnecting(true);
                          try {
                            await connectGoogleCalendar();
                          } catch (e: any) {
                            toast.error(e.message ?? 'Failed to start connection');
                            setCalendarConnecting(false);
                          }
                        })();
                      }
                    }}
                  >
                    <p className="text-[15px] font-medium text-gray-900">Google Calendar Sync</p>
                    <div className="flex items-center gap-1.5">
                      {calendarStatusLoading ? (
                        <span className="text-xs text-gray-500">Checking…</span>
                      ) : calendarStatus?.connected ? (
                        <>
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span className="text-xs text-gray-500">Connected</span>
                        </>
                      ) : (
                        <>
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          <span className="text-xs text-gray-500">
                            {calendarConnecting ? 'Opening Google…' : 'Not connected'}
                          </span>
                        </>
                      )}
                    </div>
                  </button>

                  {/* Auto-sync toggle (only when connected) */}
                  {calendarStatus?.connected && (
                    <Switch
                      checked={settings.googleCalendarAutoSync ?? false}
                      onCheckedChange={async (v) => {
                        updateSettings({ googleCalendarAutoSync: v });
                        if (v) await syncCalendar(buildCalendarPayload());
                      }}
                    />
                  )}
                </div>

                {/* Expanded details */}
                {calendarStatus?.connected && calendarExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-[#F1F5F9] pt-3">
                    {/* Connected email */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Account</span>
                      <span className="font-medium text-gray-900 text-right truncate ml-4">{userEmail}</span>
                    </div>

                    {/* Last synced */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Last synced</span>
                      <span className="font-medium text-gray-900">
                        {calendarStatus.lastSyncAt
                          ? format(new Date(calendarStatus.lastSyncAt), 'MMM d, h:mm a')
                          : 'Never'}
                      </span>
                    </div>

                    {/* Sync error */}
                    {calendarStatus.syncError && (
                      <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Sync error: {calendarStatus.syncError}</span>
                      </div>
                    )}

                    {/* Auto-sync toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Auto-sync</span>
                      <Switch
                        checked={settings.googleCalendarAutoSync ?? false}
                        onCheckedChange={async (v) => {
                          updateSettings({ googleCalendarAutoSync: v });
                          if (v) await syncCalendar(buildCalendarPayload());
                        }}
                      />
                    </div>

                    {/* Sync Now */}
                    <button
                      onClick={() => syncCalendar(buildCalendarPayload())}
                      disabled={isSyncingCalendar}
                      className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl p-3 flex items-center justify-center gap-2 transition-colors border border-blue-100 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                      <span className="font-medium text-sm">
                        {isSyncingCalendar ? 'Syncing…' : 'Sync Now'}
                      </span>
                    </button>

                    {/* Disconnect */}
                    <div className="text-center pt-1">
                      <button
                        onClick={async () => {
                          try {
                            await doDisconnect();
                            setCalendarExpanded(false);
                          } catch (e: any) {
                            toast.error(e.message ?? 'Failed to disconnect');
                          }
                        }}
                        className="text-xs text-red-500 hover:text-red-600 transition-colors inline-flex items-center gap-1"
                      >
                        <Unplug className="w-3 h-3" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </SectionCard>
            </motion.div>
          )}


          {/* ═══ NOTIFICATIONS ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <SectionLabel>Notifications</SectionLabel>
            <SectionCard>
              <SettingsRow
                icon="🔔"
                iconBg="#FEE2E2"
                label="Notifications & Alerts"
                sub={notifStatus}
                onClick={() => navigate('/settings/notifications')}
                isLast
              />
            </SectionCard>
          </motion.div>


          {/* ═══ DATA & PRIVACY ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SectionLabel>Data & Privacy</SectionLabel>
            <SectionCard>
              <SettingsRow
                icon="🔒"
                iconBg="#D1FAE5"
                label="Privacy & Data"
                sub="How your data is stored and used"
                onClick={() => navigate('/settings/privacy')}
              />
              <SettingsRow
                icon="📤"
                iconBg="#DBEAFE"
                label="Export Data"
                sub="Download your expenses as CSV or JSON"
                onClick={() => setExportSheetOpen(true)}
              />
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }

                  void handleJSONImport(file);
                }}
              />
              <SettingsRow
                icon="🧩"
                iconBg="#EFF6FF"
                label="Import JSON (Backup)"
                sub={
                  <>
                    Use this option to restore a backup exported from CalendarSpent.
                    <br />
                    This file must match the app&apos;s internal backup structure.
                  </>
                }
                subClassName="mt-1 leading-5 pr-4"
                onClick={() => jsonInputRef.current?.click()}
                showChevron={false}
              />
              <SettingsRow
                icon="📥"
                iconBg="#F0FDF4"
                label="Import CSV / Excel"
                sub={
                  <>
                    Use this option to import data from a spreadsheet.
                    <br />
                    Download the template, follow the instructions, then upload the file.
                  </>
                }
                subClassName="mt-1 leading-5 pr-4"
                onClick={() => {
                  setImportSummary(null);
                  setSpreadsheetImportOpen(true);
                }}
                isLast
              />
            </SectionCard>
          </motion.div>


          {/* ═══ DANGER ZONE ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <SectionLabel className="text-red-400">Danger Zone</SectionLabel>
            <SectionCard>
              {/* Clear Local Data */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <div>
                    <SettingsRow
                      icon="🗑️"
                      iconBg="#FEE2E2"
                      label="Clear Local Data"
                      labelClassName="text-red-600"
                      sub="Clears expenses, budgets, recurring items, and custom categories while keeping base categories"
                      onClick={() => { }}
                    />
                  </div>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl p-6">
                  <AlertDialogHeader className="text-left space-y-3">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2 mx-auto">
                      <span className="text-2xl">🗑️</span>
                    </div>
                    <AlertDialogTitle className="text-xl text-center">Delete all local data?</AlertDialogTitle>
                    <AlertDialogDescription className="text-base text-center">
                      This will reset your expenses, recurring items, budgets, and custom categories across this device and your synced account. Base categories will stay available.
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

            </SectionCard>
          </motion.div>


          {/* ═══ APP VERSION FOOTNOTE ═══ */}
          <div className="text-center pt-4 pb-4">
            <p className="text-[11px] text-[#CBD5E1]">
              CalendarSpent v1.0 · Made with ❤️ in Toronto
            </p>
          </div>

        </div>
      </div>

      <div className="lg:h-0">
        <BottomNav />
      </div>

      {/* Sheets & Modals */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      <AccountSheet open={accountSheetOpen} onOpenChange={setAccountSheetOpen} />
      <CurrencySheet
        open={currencySheetOpen}
        onOpenChange={setCurrencySheetOpen}
        selectedCurrency={selectedCurrency}
        onSelect={(code) => updateSettings({ currency: code })}
      />
      <ExportSheet
        open={exportSheetOpen}
        onOpenChange={setExportSheetOpen}
        onExportJSON={exportBackup}
        onExportCSV={exportCSV}
      />
      <SpreadsheetImportSheet
        open={spreadsheetImportOpen}
        onOpenChange={setSpreadsheetImportOpen}
        onImportFile={handleSpreadsheetImport}
        onDownloadTemplate={handleDownloadTemplate}
        isImporting={isImportingSpreadsheet}
        progress={importProgress}
        statusText={importStatusText}
        summary={importSummary}
      />
    </div>
  );
}
