/**
 * Minimal IndexedDB key-value layer for the library. Local-first: this IS the
 * database — no account, no server. Everything is best-effort async; a browser
 * without IndexedDB (or a failed transaction) degrades to in-memory state for
 * the session instead of crashing.
 */

const DB_NAME = 'tsugi';
// v2: Bibliothek ist franchise-basiert (keyPath rootId statt mediaId).
const DB_VERSION = 2;
const STORE = 'library';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      // Altes v1-Schema (keyPath mediaId) ist inkompatibel — Store neu anlegen.
      if (req.result.objectStoreNames.contains(STORE)) {
        req.result.deleteObjectStore(STORE);
      }
      req.result.createObjectStore(STORE, { keyPath: 'rootId' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

export async function dbGetAll<T>(): Promise<T[]> {
  const db = await open();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as T[]) ?? []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function dbPut<T>(value: T): Promise<void> {
  const db = await open();
  if (!db) return;
  try {
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(value);
  } catch {
    /* in-memory fallback keeps the session alive */
  }
}

export async function dbDelete(rootId: number): Promise<void> {
  const db = await open();
  if (!db) return;
  try {
    db.transaction(STORE, 'readwrite').objectStore(STORE).delete(rootId);
  } catch {
    /* ignore */
  }
}

export async function dbClear(): Promise<void> {
  const db = await open();
  if (!db) return;
  try {
    db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
  } catch {
    /* ignore */
  }
}
