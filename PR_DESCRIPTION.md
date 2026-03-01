## Summary

This PR replaces the old mocked receipt flow with a real receipt attachment experience inside the expense forms.

Users can now attach a receipt when creating or editing an expense by:
- taking a photo
- uploading an image from their device

The receipt is stored with the transaction for later reference, but no OCR/autofill is performed.

## What Changed

### Receipt attachment flow
- Added receipt upload support directly in `Add Expense`
- Added receipt upload support directly in `Edit Expense`
- Removed the old standalone mocked `Upload Receipt` screen
- Added a compatibility redirect from `/receipt-upload` to `/add`

### Receipt UI
- Added a dedicated `Save your receipt` section between `Recurring Expense` and `Note`
- Kept the preview inside a fixed-size frame so image dimensions do not affect layout
- Added tap-to-expand full-image preview
- Added `Download receipt` from the full-image modal

### File handling
- Added validation for supported image types
- Added a 35 MB upload cap
- Added HEIC/HEIF support by converting those files client-side for preview/download compatibility

## Supported Formats

- JPG / JPEG
- PNG
- WEBP
- HEIC

Limit:
- up to 35 MB

## Why

The previous receipt screen was still mocked and returned fake extracted values. This PR removes that path and keeps the feature focused on the useful V1 outcome:

- let users save a receipt with the expense
- let them view it later
- let them download it back if needed

## User-Facing Behavior

- Users can attach a receipt in both add and edit flows
- The receipt preview does not stretch the form or push Notes unpredictably
- Users can tap the preview to see the full image
- Users can download the receipt from the full-image view
- Old `/receipt-upload` links now redirect into the real Add Expense flow

## Files Changed

- `package.json`
- `package-lock.json`
- `src/app/routes.ts`
- `src/app/screens/AddExpense.tsx`
- `src/app/screens/TransactionEdit.tsx`
- `src/app/screens/ReceiptUpload.tsx` removed
- `src/app/components/receipt/ReceiptAttachmentField.tsx`
- `src/app/utils/receiptExtractionService.ts`
- `src/vite-env.d.ts`

## Manual Test Checklist

- Attach a JPG receipt from gallery in Add Expense
- Take a new receipt photo in Add Expense
- Attach a HEIC receipt and confirm preview renders
- Save an expense with a receipt and confirm it persists
- Open the receipt preview modal from Add Expense
- Download the receipt from the modal
- Edit an existing expense and replace its receipt
- Confirm Notes stays visible and is not pushed unpredictably by tall images
- Open `/receipt-upload` and confirm it redirects to `/add`
- Try an unsupported file type and confirm validation error
- Try a file larger than 35 MB and confirm validation error

## Verification

- `npm run build` passes
