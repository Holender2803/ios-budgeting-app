import { useRef } from 'react';
import { Drawer } from 'vaul';
import { Download, FileSpreadsheet, LoaderCircle, Upload } from 'lucide-react';
import { Progress } from '../ui/progress';
import { SpreadsheetImportSummary } from '../../utils/spreadsheetImport';

interface SpreadsheetImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportFile: (file: File) => Promise<void>;
  onDownloadTemplate: () => Promise<void>;
  isImporting: boolean;
  progress: number;
  statusText: string;
  summary: SpreadsheetImportSummary | null;
}

export function SpreadsheetImportSheet({
  open,
  onOpenChange,
  onImportFile,
  onDownloadTemplate,
  isImporting,
  progress,
  statusText,
  summary,
}: SpreadsheetImportSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="app-drawer-frame">
          <div className="app-drawer-panel">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            <div className="px-5 pb-2">
              <h3 className="text-lg font-semibold text-gray-900">Import CSV / Excel</h3>
              <p className="text-sm text-gray-500 mt-1">
                Use this option to import data from a spreadsheet. Download the template, follow the instructions, then upload the file.
              </p>
            </div>

            <div className="px-4 pb-8 space-y-3 overflow-y-auto">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }

                  await onImportFile(file);
                  event.target.value = '';
                }}
              />

              <button
                onClick={() => inputRef.current?.click()}
                disabled={isImporting}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  {isImporting ? (
                    <LoaderCircle className="w-5 h-5 text-green-600 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-[15px] font-medium text-gray-900">Upload .xlsx or .csv</p>
                  <p className="text-xs text-gray-500">Excel imports Categories, Recurring, and Expenses. CSV imports Expenses only.</p>
                </div>
              </button>

              <button
                onClick={onDownloadTemplate}
                disabled={isImporting}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Download className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-[15px] font-medium text-gray-900">Download Excel template</p>
                  <p className="text-xs text-gray-500">Includes instructions, example rows, and all supported sheets.</p>
                </div>
              </button>

              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="text-xs font-medium text-amber-900">We recommend using the Excel template for full import support.</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium text-gray-900">Importing the same file twice may create duplicates.</p>
                <p className="text-xs text-gray-500 mt-1">CalendarSpent skips simple duplicate matches when it can, but it does not guarantee a perfect dedupe.</p>
              </div>

              {isImporting && (
                <div className="rounded-xl border border-gray-100 px-4 py-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-gray-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{statusText}</p>
                      <p className="text-xs text-gray-500">Please keep this sheet open until import finishes.</p>
                    </div>
                  </div>
                  <Progress value={progress} className="h-2 bg-gray-200 [&_[data-slot=progress-indicator]]:bg-gray-900" />
                </div>
              )}

              {summary && !isImporting && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4 space-y-2">
                  <p className="text-sm font-semibold text-emerald-950">
                    Imported {summary.expenses} expenses, {summary.categories} categories, {summary.recurring} recurring items
                  </p>
                  {summary.skippedDuplicates > 0 && (
                    <p className="text-xs text-emerald-900">
                      Skipped {summary.skippedDuplicates} duplicate row{summary.skippedDuplicates === 1 ? '' : 's'}.
                    </p>
                  )}
                  {summary.warnings.map((warning) => (
                    <p key={warning} className="text-xs text-emerald-900">
                      {warning}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
