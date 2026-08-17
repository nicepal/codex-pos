// Lightweight IndexedDB queue for offline POS orders. No external deps.
const DB_NAME = 'codexpos-offline';
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
  const clientOrderId = payload.client_order_id
    || `off_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    localId: clientOrderId,
    payload: { ...payload, client_order_id: clientOrderId },
    createdAt: new Date().toISOString(),
    attempts: 0,
    syncStatus: 'pending',
    syncedOrderId: null,
    lastError: null,
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
      rec.syncStatus = 'failed';
      const putReq = store.put(rec);
      putReq.onsuccess = () => resolve(rec);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function markQueuedOrderSynced(localId, syncedOrderId) {
  const db = await openDB();
  const store = tx(db, 'readwrite');
  return new Promise((resolve, reject) => {
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (!rec) { resolve(null); return; }
      rec.syncStatus = 'synced';
      rec.syncedOrderId = syncedOrderId || null;
      rec.lastError = null;
      const putReq = store.put(rec);
      putReq.onsuccess = () => resolve(rec);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

async function updateRecord(localId, patch) {
  const db = await openDB();
  const store = tx(db, 'readwrite');
  return new Promise((resolve, reject) => {
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (!rec) { resolve(null); return; }
      const next = { ...rec, ...patch };
      const putReq = store.put(next);
      putReq.onsuccess = () => resolve(next);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/** Reset failed row for manual retry. */
export async function retryQueuedOrder(localId) {
  return updateRecord(localId, {
    attempts: 0,
    syncStatus: 'pending',
    lastError: null,
  });
}

/** Update payload (keeps client_order_id stable). */
export async function updateQueuedOrderPayload(localId, payload) {
  const db = await openDB();
  const store = tx(db, 'readwrite');
  return new Promise((resolve, reject) => {
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (!rec) { resolve(null); return; }
      const clientOrderId = rec.payload?.client_order_id || rec.localId;
      rec.payload = { ...payload, client_order_id: clientOrderId };
      rec.attempts = 0;
      rec.syncStatus = 'pending';
      rec.lastError = null;
      const putReq = store.put(rec);
      putReq.onsuccess = () => resolve(rec);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/** Dismiss with audit note stored locally. */
export async function dismissQueuedOrder(localId, reason) {
  return updateRecord(localId, {
    syncStatus: 'dismissed',
    dismissReason: reason || 'Dismissed by cashier',
    lastError: null,
  });
}

export async function purgeSyncedOrders(maxAgeMs = 24 * 60 * 60 * 1000) {
  const db = await openDB();
  const store = tx(db, 'readwrite');
  const cutoff = Date.now() - maxAgeMs;
  return new Promise((resolve, reject) => {
    const getAll = store.getAll();
    getAll.onsuccess = () => {
      const rows = getAll.result || [];
      const stale = rows.filter((rec) => {
        if (rec.syncStatus !== 'synced') return false;
        const ts = Date.parse(rec.createdAt || 0);
        return Number.isFinite(ts) && ts < cutoff;
      });
      if (!stale.length) { resolve(0); return; }
      let left = stale.length;
      stale.forEach((rec) => {
        const del = store.delete(rec.localId);
        del.onsuccess = () => {
          left -= 1;
          if (left === 0) resolve(stale.length);
        };
        del.onerror = () => reject(del.error);
      });
    };
    getAll.onerror = () => reject(getAll.error);
  });
}

export async function countQueuedOrders() {
  const orders = await getQueuedOrders();
  return orders.length;
}
