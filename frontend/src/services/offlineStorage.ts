import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'platform-rt-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'rt-cache';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

export async function setOfflineCache<T>(key: string, data: T): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, { data, timestamp: Date.now() }, key);
  } catch (err) {
    console.warn('Failed to set IndexedDB offline cache:', err);
  }
}

export async function getOfflineCache<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    const result = await db.get(STORE_NAME, key);
    return result ? (result.data as T) : null;
  } catch (err) {
    console.warn('Failed to get IndexedDB offline cache:', err);
    return null;
  }
}

export async function clearOfflineCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
  } catch (err) {
    console.warn('Failed to clear IndexedDB offline cache:', err);
  }
}
