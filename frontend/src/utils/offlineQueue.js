// Lightweight IndexedDB queue for offline POS orders. No external deps.
const DB_NAME = 'eyz-pos-offline';
const DB_VERSION = 1;
const STORE = 'pending_orders';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'localId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function enqueueOrder(payload) {
  const db = await openDB();
  const record = {
    localId: `off_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').add(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function getQueuedOrders() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueuedOrder(localId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').delete(localId);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function bumpAttempt(localId, errorMessage) {
  const db = await openDB();
  const store = tx(db, 'readwrite');
  return new Promise((resolve, reject) => {
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (!rec) { resolve(null); return; }
      rec.attempts = (rec.attempts || 0) + 1;
      rec.lastError = errorMessage || null;
      const putReq = store.put(rec);
      putReq.onsuccess = () => resolve(rec);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function countQueuedOrders() {
  const orders = await getQueuedOrders();
  return orders.length;
}
