const DB_NAME = 'CalendarSpentDB';
const DB_VERSION = 1;
const STORES = ['transactions', 'categories', 'vendorRules', 'settings', 'recurringExceptions'];
const GUEST_SCOPE = 'guest';
const KEY_SEPARATOR = '::';

export function getStorageScope(userId?: string | null) {
    return userId ? `user:${userId}` : GUEST_SCOPE;
}

function toScopedKey(scope: string, key: string) {
    return `${scope}${KEY_SEPARATOR}${key}`;
}

function isScopedKey(key: IDBValidKey, scope: string) {
    return typeof key === 'string' && key.startsWith(`${scope}${KEY_SEPARATOR}`);
}

export const storage = {
    db: null as IDBDatabase | null,

    async init(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;
                STORES.forEach((storeName) => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName);
                    }
                });
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onerror = () => reject(request.error);
        });
    },

    async get<T>(storeName: string, key: string, scope = GUEST_SCOPE): Promise<T | null> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(toScopedKey(scope, key));

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    async set<T>(storeName: string, key: string, value: T, scope = GUEST_SCOPE): Promise<void> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(value, toScopedKey(scope, key));

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getAll<T>(storeName: string, scope = GUEST_SCOPE): Promise<T[]> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.openCursor();
            const results: T[] = [];

            request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor) {
                    resolve(results);
                    return;
                }

                if (isScopedKey(cursor.key, scope)) {
                    results.push(cursor.value as T);
                }

                cursor.continue();
            };
            request.onerror = () => reject(request.error);
        });
    },

    async remove(storeName: string, key: string, scope = GUEST_SCOPE): Promise<void> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(toScopedKey(scope, key));

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async clearScope(scope = GUEST_SCOPE): Promise<void> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES, 'readwrite');
            let hasError = false;
            let pendingStores = STORES.length;

            const finishStore = () => {
                pendingStores--;
                if (!hasError && pendingStores === 0) {
                    resolve();
                }
            };

            STORES.forEach((storeName) => {
                const store = transaction.objectStore(storeName);
                const request = store.openCursor();

                request.onsuccess = () => {
                    const cursor = request.result;
                    if (!cursor) {
                        finishStore();
                        return;
                    }

                    if (isScopedKey(cursor.key, scope)) {
                        const deleteRequest = cursor.delete();
                        deleteRequest.onsuccess = () => cursor.continue();
                        deleteRequest.onerror = () => {
                            hasError = true;
                            reject(deleteRequest.error);
                        };
                        return;
                    }

                    cursor.continue();
                };
                request.onerror = () => {
                    hasError = true;
                    reject(request.error);
                };
            });
        });
    },

    async clearAll(): Promise<void> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES, 'readwrite');
            let completed = 0;
            let hasError = false;

            STORES.forEach(storeName => {
                const store = transaction.objectStore(storeName);
                const request = store.clear();

                request.onsuccess = () => {
                    completed++;
                    if (!hasError && completed === STORES.length) {
                        resolve();
                    }
                };
                request.onerror = () => {
                    hasError = true;
                    reject(request.error);
                };
            });
        });
    },
};
