import { Transaction, Category, VendorRule, RecurringException } from '../types';

export const isUUID = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const ensureUUIDs = (
    transactions: Transaction[],
    categories: Category[],
    vendorRules: VendorRule[],
    exceptions: RecurringException[]
) => {
    let changed = false;
    const uuidMap = new Map<string, string>();

    const getOrGenerateUUID = (oldId: string) => {
        if (uuidMap.has(oldId)) return uuidMap.get(oldId)!;
        const newId = crypto.randomUUID();
        uuidMap.set(oldId, newId);
        return newId;
    };

    const migratedCategories = categories.map(cat => {
        if (!cat.id.startsWith('cat-') && !isUUID(cat.id)) {
            changed = true;
            return { ...cat, id: getOrGenerateUUID(cat.id), updatedAt: Date.now() };
        }
        return cat;
    });

    const migratedTransactions = transactions.map(t => {
        let tChanged = false;
        let newT = { ...t };

        if (!isUUID(newT.id)) {
            newT.id = getOrGenerateUUID(newT.id);
            tChanged = true;
        }

        if (!newT.category.startsWith('cat-') && !isUUID(newT.category)) {
            const mapped = uuidMap.get(newT.category);
            if (mapped) {
                newT.category = mapped;
                tChanged = true;
            }
        }

        if (tChanged) {
            newT.updatedAt = Date.now();
            changed = true;
        }
        return newT;
    });

    const migratedRules = vendorRules.map(r => {
        let rChanged = false;
        let newR = { ...r };

        if (!isUUID(newR.id)) {
            newR.id = getOrGenerateUUID(newR.id);
            rChanged = true;
        }

        if (!newR.categoryId.startsWith('cat-') && !isUUID(newR.categoryId)) {
            const mapped = uuidMap.get(newR.categoryId);
            if (mapped) {
                newR.categoryId = mapped;
                rChanged = true;
            }
        }

        if (rChanged) {
            newR.updatedAt = Date.now();
            changed = true;
        }
        return newR;
    });

    const migratedExceptions = exceptions.map(e => {
        if (uuidMap.has(e.ruleId)) {
            changed = true;
            return { ...e, ruleId: uuidMap.get(e.ruleId)! };
        }
        return e;
    });

    return {
        categories: migratedCategories,
        transactions: migratedTransactions,
        vendorRules: migratedRules,
        exceptions: migratedExceptions,
        changed,
        uuidMap
    };
};
