import { supabase } from './supabaseClient';
import { Transaction, Category, VendorRule, Settings, RecurringException } from '../app/types';
import { storage } from '../app/utils/storage';
import { isUUID } from '../app/utils/uuidMigration';

// --- Mappers ---

function mapExpenseToLocal(row: any): Transaction {
    return {
        id: row.id,
        vendor: row.vendor,
        amount: row.amount,
        category: row.category_id,
        date: row.date,
        note: row.note || undefined,
        photoUrl: row.photo_url || undefined,
        isRecurring: row.is_recurring,
        recurrenceType: row.recurrence_type || undefined,
        endDate: row.end_date || undefined,
        isActive: row.is_active,
        endedAt: row.ended_at ? new Date(row.ended_at).toISOString().split('T')[0] : undefined,
        updatedAt: new Date(row.updated_at).getTime(),
        deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : undefined,
    };
}

function mapExpenseToRemote(local: Transaction, userId: string): any {
    return {
        id: local.id,
        user_id: userId,
        vendor: local.vendor,
        category_id: local.category,
        amount: local.amount,
        date: local.date,
        note: local.note,
        photo_url: local.photoUrl,
        is_recurring: local.isRecurring ?? false,
        recurrence_type: local.recurrenceType,
        end_date: local.endDate,
        is_active: local.isActive ?? true,
        ended_at: local.endedAt ? new Date(local.endedAt).toISOString() : null,
        updated_at: local.updatedAt ? new Date(local.updatedAt).toISOString() : new Date().toISOString(),
        deleted_at: local.deletedAt ? new Date(local.deletedAt).toISOString() : null,
    };
}

function mapCategoryToLocal(row: any): Category {
    return {
        id: row.id,
        name: row.name,
        icon: row.icon || 'Box', // default fallback
        color: row.color || '#cccccc',
        group: row.group || 'Other',
        updatedAt: new Date(row.updated_at).getTime(),
        deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : undefined,
    };
}

function mapCategoryToRemote(local: Category, userId: string): any {
    return {
        id: local.id,
        user_id: userId,
        name: local.name,
        icon: local.icon,
        color: local.color,
        "group": local.group,
        is_system: local.id.startsWith('cat-'),
        updated_at: local.updatedAt ? new Date(local.updatedAt).toISOString() : new Date().toISOString(),
        deleted_at: local.deletedAt ? new Date(local.deletedAt).toISOString() : null,
    };
}

function mapRuleToLocal(row: any): VendorRule {
    return {
        id: row.id,
        vendorContains: row.vendor_contains,
        categoryId: row.category_id,
        source: row.source === 'system' ? 'default' : 'user',
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime(),
        deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : undefined,
    };
}

function mapRuleToRemote(local: VendorRule, userId: string): any {
    return {
        id: local.id,
        user_id: userId,
        vendor_contains: local.vendorContains,
        category_id: local.categoryId,
        source: local.source === 'default' ? 'system' : 'user',
        created_at: new Date(local.createdAt).toISOString(),
        updated_at: local.updatedAt ? new Date(local.updatedAt).toISOString() : new Date().toISOString(),
        deleted_at: local.deletedAt ? new Date(local.deletedAt).toISOString() : null,
    };
}

function mapExceptionToLocal(row: any): RecurringException {
    return {
        id: `${row.rule_id}-${row.date}`,
        ruleId: row.rule_id,
        date: row.date,
        skipped: row.skipped,
        note: row.note || undefined,
        updatedAt: new Date(row.updated_at).getTime(),
        deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : undefined,
    };
}

function mapExceptionToRemote(local: RecurringException, userId: string): any {
    return {
        rule_id: local.ruleId,
        date: local.date,
        user_id: userId,
        skipped: local.skipped,
        note: local.note,
        updated_at: local.updatedAt ? new Date(local.updatedAt).toISOString() : new Date().toISOString(),
        deleted_at: local.deletedAt ? new Date(local.deletedAt).toISOString() : null,
    };
}

// --- Sync Service ---

export class SyncService {
    static async sync(
        localTransactions: Transaction[],
        localCategories: Category[],
        localVendorRules: VendorRule[],
        localExceptions: RecurringException[],
        settings: Settings,
        updateContextState: (transactions: Transaction[], categories: Category[], vendorRules: VendorRule[], exceptions: RecurringException[], newSettings: Partial<Settings>) => void
    ) {
        if (!supabase) {
            console.log('Sync disabled: Supabase not configured');
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user) {
            console.log('Sync disabled: User not signed in');
            return;
        }

        const userId = session.user.id;
        const lastPullAt = settings.lastPullAt ? new Date(settings.lastPullAt).toISOString() : new Date(0).toISOString();
        const lastPushAt = settings.lastPushAt || 0;
        const syncTimestamp = Date.now();

        // Accumulators for partial success
        let mergedTransactions = localTransactions;
        let mergedCategories = localCategories;
        let mergedRules = localVendorRules;
        let mergedExceptions = localExceptions;
        let syncErrors: string[] = [];

        try {
            // ==========================================
            // 1. PULL FROM REMOTE (Isolated)
            // ==========================================

            // Expenses
            try {
                const { data: remoteExpenses, error: eErr } = await supabase
                    .from('expenses')
                    .select('*')
                    .or(`updated_at.gt.${lastPullAt},deleted_at.gt.${lastPullAt}`);
                if (eErr) throw eErr;
                mergedTransactions = this.mergeCollections(localTransactions, remoteExpenses || [], mapExpenseToLocal);
            } catch (err: any) {
                console.warn('Sync Pull (expenses) failed:', err.message);
                syncErrors.push(`Expenses Pull: ${err.message}`);
            }

            // Categories
            try {
                const { data: remoteCategories, error: cErr } = await supabase
                    .from('categories')
                    .select('*')
                    .or(`updated_at.gt.${lastPullAt},deleted_at.gt.${lastPullAt}`);
                if (cErr) throw cErr;
                mergedCategories = this.mergeCollections(localCategories, remoteCategories || [], mapCategoryToLocal);
            } catch (err: any) {
                console.warn('Sync Pull (categories) failed:', err.message);
                syncErrors.push(`Categories Pull: ${err.message}`);
            }

            // Rules
            try {
                const { data: remoteRules, error: rErr } = await supabase
                    .from('vendor_rules')
                    .select('*')
                    .or(`updated_at.gt.${lastPullAt},deleted_at.gt.${lastPullAt}`);
                if (rErr) throw rErr;
                mergedRules = this.mergeCollections(localVendorRules, remoteRules || [], mapRuleToLocal);
            } catch (err: any) {
                console.warn('Sync Pull (vendor_rules) failed:', err.message);
                syncErrors.push(`Vendor Rules Pull: ${err.message}`);
            }

            // Exceptions (Optional)
            try {
                const { data: remoteExceptions, error: xErr } = await supabase
                    .from('recurring_exceptions')
                    .select('*')
                    .or(`updated_at.gt.${lastPullAt},deleted_at.gt.${lastPullAt}`);
                if (xErr) throw xErr;
                mergedExceptions = this.mergeCollections(localExceptions, remoteExceptions || [], mapExceptionToLocal);
            } catch (err: any) {
                console.warn('Sync Pull (recurring_exceptions) failed:', err.message);
                // We don't necessarily treat this as a fatal core sync error if it's just "table not found"
                if (!err.message.includes('schema cache')) {
                    syncErrors.push(`Recurring Exceptions Pull: ${err.message}`);
                }
            }

            // ==========================================
            // 2. PUSH TO REMOTE (Isolated)
            // ==========================================

            // Expenses
            try {
                const dirtyExpenses = mergedTransactions.filter(t => t.updatedAt && t.updatedAt > lastPushAt);
                const validDirtyExpenses = dirtyExpenses.filter(t => isUUID(t.id));
                if (validDirtyExpenses.length > 0) {
                    const { error } = await supabase.from('expenses').upsert(
                        validDirtyExpenses.map(t => mapExpenseToRemote(t, userId))
                    );
                    if (error) throw error;
                }
            } catch (err: any) {
                console.warn('Sync Push (expenses) failed:', err.message);
                syncErrors.push(`Expenses Push: ${err.message}`);
            }

            // Categories
            try {
                const dirtyCategories = mergedCategories.filter(c => c.updatedAt && c.updatedAt > lastPushAt);
                const validDirtyCategories = dirtyCategories.filter(c => c.id.startsWith('cat-') || isUUID(c.id));
                if (validDirtyCategories.length > 0) {
                    const { error } = await supabase.from('categories').upsert(
                        validDirtyCategories.map(c => mapCategoryToRemote(c, userId))
                    );
                    if (error) throw error;
                }
            } catch (err: any) {
                console.warn('Sync Push (categories) failed:', err.message);
                syncErrors.push(`Categories Push: ${err.message}`);
            }

            // Rules
            try {
                const dirtyRules = mergedRules.filter(r => r.updatedAt && r.updatedAt > lastPushAt);
                const validDirtyRules = dirtyRules.filter(r => isUUID(r.id));
                if (validDirtyRules.length > 0) {
                    const { error } = await supabase.from('vendor_rules').upsert(
                        validDirtyRules.map(r => mapRuleToRemote(r, userId))
                    );
                    if (error) throw error;
                }
            } catch (err: any) {
                console.warn('Sync Push (vendor_rules) failed:', err.message);
                syncErrors.push(`Vendor Rules Push: ${err.message}`);
            }

            // Exceptions (Optional)
            try {
                const dirtyExceptions = mergedExceptions.filter(x => x.updatedAt && x.updatedAt > lastPushAt);
                const validDirtyExceptions = dirtyExceptions.filter(x => isUUID(x.ruleId));
                if (validDirtyExceptions.length > 0) {
                    const { error } = await supabase.from('recurring_exceptions').upsert(
                        validDirtyExceptions.map(x => mapExceptionToRemote(x, userId))
                    );
                    if (error) throw error;
                }
            } catch (err: any) {
                console.warn('Sync Push (recurring_exceptions) failed:', err.message);
                if (!err.message.includes('schema cache')) {
                    syncErrors.push(`Recurring Exceptions Push: ${err.message}`);
                }
            }

            // ==========================================
            // 3. PERSIST & UPDATE STATE
            // ==========================================

            // Persist the merged collections to IndexedDB
            for (const t of mergedTransactions) await storage.set('transactions', t.id, t);
            for (const c of mergedCategories) await storage.set('categories', c.id, c);
            for (const r of mergedRules) await storage.set('vendorRules', r.id, r);
            for (const x of mergedExceptions) await storage.set('recurringExceptions', x.id, x);

            // Update settings
            const hasFatalError = syncErrors.length > 0;
            const newSettings: Partial<Settings> = {
                lastPullAt: syncTimestamp,
                lastPushAt: syncTimestamp,
                lastSyncError: hasFatalError ? syncErrors.join(' | ') : undefined
            };

            await storage.set('settings', 'app_settings', { ...settings, ...newSettings });

            // Send back to React context
            updateContextState(mergedTransactions, mergedCategories, mergedRules, mergedExceptions, newSettings);

        } catch (error: any) {
            console.error('Core Sync Failure:', error);
            const newSettings: Partial<Settings> = { lastSyncError: `Fatal: ${error.message}` };
            await storage.set('settings', 'app_settings', { ...settings, ...newSettings });
            updateContextState(localTransactions, localCategories, localVendorRules, localExceptions, newSettings);
        }
    }

    private static mergeCollections<T extends { id: string; updatedAt?: number }>(
        localArray: T[],
        remoteRows: any[],
        mapToLocal: (row: any) => T
    ): T[] {
        const localMap = new Map(localArray.map(item => [item.id, item]));

        for (const row of remoteRows) {
            const remoteItem = mapToLocal(row);
            const localItem = localMap.get(remoteItem.id);

            if (!localItem) {
                // If it doesn't exist locally at all, accept remote
                localMap.set(remoteItem.id, remoteItem);
            } else {
                // Last Writer Wins via updatedAt
                const remoteTime = remoteItem.updatedAt || 0;
                const localTime = localItem.updatedAt || 0;
                if (remoteTime >= localTime) {
                    localMap.set(remoteItem.id, remoteItem);
                }
            }
        }

        return Array.from(localMap.values());
    }
}
