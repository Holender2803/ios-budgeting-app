import { Drawer } from 'vaul';
import { FileJson, FileSpreadsheet } from 'lucide-react';

interface ExportSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onExportJSON: () => void;
    onExportCSV: () => void;
}

export function ExportSheet({ open, onOpenChange, onExportJSON, onExportCSV }: ExportSheetProps) {
    return (
        <Drawer.Root open={open} onOpenChange={onOpenChange}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                <Drawer.Content className="app-drawer-frame">
                    <div className="app-drawer-panel">
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 rounded-full bg-gray-300" />
                        </div>

                        <div className="px-5 pb-2">
                            <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
                            <p className="text-sm text-gray-500 mt-1">Choose a format for your backup</p>
                        </div>

                        <div className="px-4 pb-8 space-y-2">
                            <button
                                onClick={() => {
                                    onExportCSV();
                                    onOpenChange(false);
                                }}
                                className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
                            >
                                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[15px] font-medium text-gray-900">Export as CSV</p>
                                    <p className="text-xs text-gray-500">Spreadsheet-compatible format</p>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    onExportJSON();
                                    onOpenChange(false);
                                }}
                                className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
                            >
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <FileJson className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[15px] font-medium text-gray-900">Export as JSON</p>
                                    <p className="text-xs text-gray-500">Full backup with all data</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
