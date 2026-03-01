# Fix user data isolation in PWA

## Summary

This PR fixes a critical privacy issue where expenses could appear across accounts on a shared device, fresh browser, or fresh PWA install.

Phase 1 only:

- Enforces per-user isolation for synced expense data.
- Clears or scopes local state on auth changes.
- Prevents authenticated users from seeing demo or phantom local data.
- Does not implement sharing or household access.

## Root Cause

The issue had two contributing paths:

1. Local persistence leak
   - The app hydrated from a single shared IndexedDB/localStorage namespace before auth state was fully resolved.
   - That allowed a later login on the same device/browser to inherit cached data from a previous user.

2. Server query hardening gap
   - Sync pulls were using broad `select('*')` queries without explicit `user_id` filters in the client.
   - The repo had RLS definitions in `supabase/schema.sql`, but there was no migration ensuring those protections were actually applied in the target database.

There is no service worker cache path in this repo, so this was not caused by a Workbox/service-worker response cache.

## Changes

### Database

- Added `supabase/migrations/20260301_user_data_isolation.sql`.
- Ensures `expenses`, `categories`, `vendor_rules`, and `recurring_exceptions` have `user_id`.
- Enables RLS on those tables.
- Recreates policies so authenticated users can only `SELECT/INSERT/UPDATE/DELETE` rows where `user_id = auth.uid()`.
- Adds supporting indexes on `user_id`, `updated_at`, and `deleted_at`.

### Client

- Refactored IndexedDB storage to use scoped keys:
  - `guest`
  - `user:<auth.uid()>`
- Rehydration is now auth-aware instead of running once globally on app startup.
- On login/logout/account switch:
  - in-memory app state resets
  - the app hydrates only from the active user scope
  - cross-user cache bleed is prevented
- Authenticated users no longer seed demo data into their signed-in experience.
- Import/reset flows clear only the active local scope instead of mixing user caches.

### Query hardening

- Sync reads now explicitly filter by `user_id`.
- Calendar status read is explicitly filtered by `user_id`.
- Sync persistence writes are stored in the active user scope.

## Files Changed

- `src/app/context/ExpenseContext.tsx`
- `src/app/utils/storage.ts`
- `src/lib/syncService.ts`
- `src/lib/calendarService.ts`
- `supabase/migrations/20260301_user_data_isolation.sql`

## Manual QA

1. Run the Supabase SQL migration against the target project.
2. Start the app locally with `npm run dev`.
3. Test account A:
   - Log in
   - Create multiple expenses
   - Confirm they appear normally
4. Test account B in incognito or a fresh browser:
   - Log in
   - Confirm B sees only B data or an empty state
   - Confirm A's Jan/Feb expenses never appear
5. Test same-device switch:
   - Log in as A
   - Log out
   - Log in as B
   - Confirm no A data remains visible or flashes in the UI
6. Test PWA/fresh install path:
   - Open from a fresh browser or installed shortcut
   - Log in as B
   - Confirm no demo or phantom expenses appear after login
7. Verify network behavior:
   - Confirm expense sync/read paths are scoped to the authenticated user
   - No unscoped expense fetch path should return shared data

## Verification

- `npm run build`

Build passed successfully.

## Out of Scope

- Household sharing
- Explicit shared views
- Attribution/reporting for shared expenses

Those remain Phase 2 work.
