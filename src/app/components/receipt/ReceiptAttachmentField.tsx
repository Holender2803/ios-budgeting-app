import { useMemo, useState } from 'react';
import { Camera, Download, Expand } from 'lucide-react';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface ReceiptAttachmentFieldProps {
  photoUrl: string;
  onTakePhoto: () => void;
  onUpload: () => void;
}

function inferReceiptExtension(photoUrl: string) {
  if (photoUrl.startsWith('data:image/jpeg')) return 'jpg';
  if (photoUrl.startsWith('data:image/png')) return 'png';
  if (photoUrl.startsWith('data:image/webp')) return 'webp';
  if (photoUrl.startsWith('data:image/heic')) return 'heic';
  if (photoUrl.startsWith('data:image/heif')) return 'heif';
  return 'jpg';
}

export function ReceiptAttachmentField({
  photoUrl,
  onTakePhoto,
  onUpload,
}: ReceiptAttachmentFieldProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const downloadName = useMemo(
    () => `calendarspent-receipt.${inferReceiptExtension(photoUrl)}`,
    [photoUrl],
  );

  return (
    <>
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-gray-900 font-medium block">Save your receipt</Label>
            <span className="text-xs text-gray-500">
              Optional photo for reference later. JPG, JPEG, PNG, WEBP, HEIC up to 35 MB.
            </span>
          </div>
          {photoUrl && (
            <span className="text-[11px] font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
              Attached
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onTakePhoto}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Camera className="w-4 h-4" />
            Take photo
          </button>
          <button
            type="button"
            onClick={onUpload}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <span className="text-base leading-none">🖼️</span>
            {photoUrl ? 'Replace' : 'Upload'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => photoUrl && setPreviewOpen(true)}
          disabled={!photoUrl}
          className={`w-full h-44 rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden relative transition-colors sm:h-52 ${
            photoUrl ? 'cursor-zoom-in hover:border-gray-300' : 'cursor-default'
          }`}
        >
          {photoUrl ? (
            <>
              <img src={photoUrl} alt="Receipt" className="w-full h-full object-cover" />
              <div className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white">
                <Expand className="w-3.5 h-3.5" />
                View full receipt
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
              No receipt attached
            </div>
          )}
        </button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-4xl rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
            <DialogDescription>View the full image or download it back to your device.</DialogDescription>
          </DialogHeader>

          {photoUrl && (
            <div className="space-y-4 overflow-hidden">
              <div className="w-full max-h-[75vh] rounded-2xl overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center">
                <img src={photoUrl} alt="Full receipt" className="max-w-full max-h-[75vh] object-contain" />
              </div>

              <div className="flex justify-end">
                <a
                  href={photoUrl}
                  download={downloadName}
                  className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download receipt
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
