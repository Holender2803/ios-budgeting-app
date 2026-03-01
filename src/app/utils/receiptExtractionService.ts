import heic2any from 'heic2any';

const MAX_RECEIPT_FILE_SIZE_BYTES = 35 * 1024 * 1024;
const SUPPORTED_RECEIPT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export class ReceiptFileValidationError extends Error {}

const readBlobAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read receipt image'));
    reader.readAsDataURL(blob);
  });

const isHeicLikeFile = (file: File) => file.type === 'image/heic' || file.type === 'image/heif';

export const readReceiptFileAsDataUrl = async (file: File) => {
  if (!isHeicLikeFile(file)) {
    return readBlobAsDataUrl(file);
  }

  const converted = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.92,
  });

  const normalizedBlob = Array.isArray(converted) ? converted[0] : converted;
  return readBlobAsDataUrl(normalizedBlob as Blob);
};

export function validateReceiptFile(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new ReceiptFileValidationError('Receipts must be uploaded as an image.');
  }

  if (file.type && !SUPPORTED_RECEIPT_TYPES.has(file.type)) {
    throw new ReceiptFileValidationError('Use JPG, PNG, WEBP, or HEIC receipt images.');
  }

  if (file.size > MAX_RECEIPT_FILE_SIZE_BYTES) {
    throw new ReceiptFileValidationError('Receipt images must be 35 MB or smaller.');
  }
}
