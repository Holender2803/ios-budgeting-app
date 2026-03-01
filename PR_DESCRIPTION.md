## Summary

This PR improves CalendarSpent's web responsiveness, fixes the desktop budgets presentation, and hardens category/vendor intelligence.

It does three main things:

1. Makes the primary app screens usable on tablet and desktop without regressing mobile.
2. Ensures the app always preserves a fixed system set of default categories, even after JSON or spreadsheet imports.
3. Improves vendor autocomplete and category recommendations using both user history and premade vendor rules.

## What Changed

### Responsive web polish
- Added shared responsive shell utilities for narrow forms and wider dashboard screens
- Improved desktop layout behavior for:
  - Home
  - Reports
  - Budgets
  - Settings
  - Privacy
  - Add Expense
  - Edit Expense
- Switched desktop navigation from a stretched bottom bar to a cleaner left-side nav rail on wide screens
- Constrained sheets and modals on desktop so they render as centered panels instead of full-width mobile drawers
- Improved receipt preview and full-image modal behavior on larger screens

### Budgets desktop cleanup
- Reworked the budgets page layout so the desktop view reads as a proper dashboard instead of a mobile stack on a wide canvas
- Fixed the insight/list balance so non-current months do not leave awkward empty desktop space

### Default categories are now enforced
- Replaced the previous system category set with the required default categories
- Added enforcement so default categories always exist locally
- Preserved system categories across:
  - initial hydration
  - JSON backup import
  - spreadsheet import
  - sync reconciliation
  - clear/reset flows
- Kept imported non-default categories as custom categories instead of letting imports replace the system set
- Prevented deleted or missing category references from falling back to arbitrary categories by routing them to `Uncategorized`

### Vendor autocomplete and category recommendations
- Added a premade vendor intelligence map
- Vendor suggestions now come from:
  - user transaction history
  - premade vendor list
- Matching is case-insensitive and punctuation-insensitive
- Suggestion ranking now prefers:
  - exact match
  - startsWith
  - contains
- Category recommendation now uses the best vendor match with the same ranking logic
- Existing manual category choice behavior is preserved

### Dev verification output
- Added a dev-only console check that logs:
  - whether defaults exist
  - `Uber Eats -> Takeout / Delivery`
  - `Fido Mobile -> Internet & Mobile`
  - `Rent -> Rent / Housing`
  - `Amazon -> Amazon`

## User-Facing Behavior

- Desktop users get a cleaner layout with a left nav rail and properly constrained content
- Add/Edit forms stay mobile-first but feel less cramped on tablet and less awkward on desktop
- Sheets and receipt previews no longer feel like oversized mobile surfaces on large screens
- Default categories remain available even after import operations
- Vendor autocomplete works for both new users and returning users
- Premade vendors can suggest categories immediately, even with no prior history

## Files Changed

- `PR_DESCRIPTION.md`
- `src/styles/index.css`
- `src/app/components/BottomNav.tsx`
- `src/app/components/CategoryFilterBar.tsx`
- `src/app/components/budgets/BudgetCategorySheet.tsx`
- `src/app/components/category/RecentCategories.tsx`
- `src/app/components/receipt/ReceiptAttachmentField.tsx`
- `src/app/components/reports/CustomDateSheet.tsx`
- `src/app/components/settings/AccountSheet.tsx`
- `src/app/components/settings/CurrencySheet.tsx`
- `src/app/components/settings/ExportSheet.tsx`
- `src/app/components/settings/SpreadsheetImportSheet.tsx`
- `src/app/constants/systemCategories.ts`
- `src/app/constants/vendorIntelligence.ts`
- `src/app/context/ExpenseContext.tsx`
- `src/app/hooks/useVendorSuggestions.ts`
- `src/app/screens/AddExpense.tsx`
- `src/app/screens/BudgetsTracking.tsx`
- `src/app/screens/Home.tsx`
- `src/app/screens/PrivacyInfo.tsx`
- `src/app/screens/Reports.tsx`
- `src/app/screens/Settings.tsx`
- `src/app/screens/TransactionEdit.tsx`
- `src/app/utils/generateDemoData.ts`

## Manual Test Checklist

- Check `/`, `/reports`, `/budgets`, `/settings`, `/add` on:
  - `375px`
  - `430px`
  - `768px`
  - `1024px`
  - `1440px`
- Confirm desktop navigation looks intentional and not stretched
- Confirm Add Expense and Edit Expense remain solid on mobile and usable on desktop
- Confirm receipt preview and full-image modal do not overflow on desktop
- Confirm budgets screen looks balanced on desktop for:
  - current month
  - non-current month
- Confirm default categories still exist after:
  - app load
  - JSON import
  - spreadsheet import
- Type `Uber Eats` and confirm category suggestion is `Takeout / Delivery`
- Type `Fido Mobile` and confirm category suggestion is `Internet & Mobile`
- Type `Rent` and confirm category suggestion is `Rent / Housing`
- Type `Amazon` and confirm category suggestion is `Amazon`

## Verification

- `npm run build` passes
