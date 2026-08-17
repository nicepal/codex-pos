import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import {
  getQueuedOrders,
  bumpAttempt,
  markQueuedOrderSynced,
  purgeSyncedOrders,
  retryQueuedOrder,
} from '../utils/offlineQueue';
import useOnlineStatus from './useOnlineStatus';

function isOpenQueueRow(o) {
  return o.syncStatus !== 'synced' && o.syncStatus !== 'dismissed';
}

/**
 * Tracks queued offline orders and flushes them to the server when the
 * connection returns. Relies on `client_order_id` for server-side idempotency
 * so a retried order is never duplicated.
 */
export default function useOfflineOrderSync({ onSynced } = {}) {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      await purgeSyncedOrders();
      const orders = await getQueuedOrders();
      const open = orders.filter(isOpenQueueRow);
      setPending(open.length);
      return open.length;
    } catch {
      return 0;
    }
  }, []);

  const syncOne = useCallback(async (rec) => {
    const res = await api.post('/orders', rec.payload);
    const orderId = res.data?.data?.id;
    await markQueuedOrderSynced(rec.localId, orderId);
    return {
      localId: rec.localId,
      orderId,
      clientOrderId: rec.payload?.client_order_id,
    };
  }, []);

  const flushSingle = useCallback(async (localId) => {
    if (syncing) return null;
    let orders;
    try {
      orders = await getQueuedOrders();
    } catch {
      return null;
    }
    const rec = orders.find((o) => o.localId === localId);
    if (!rec || !isOpenQueueRow(rec)) return null;

    setSyncing(true);
    try {
      await retryQueuedOrder(localId);
      const fresh = (await getQueuedOrders()).find((o) => o.localId === localId) || rec;
      const synced = await syncOne(fresh);
      await refreshCount();
      if (onSynced) onSynced([synced]);
      return synced;
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || err.message || 'Sync failed';
      await bumpAttempt(localId, message);
      await refreshCount();
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [syncing, syncOne, refreshCount, onSynced]);

  const flush = useCallback(async () => {
    if (syncing) return;
    let orders;
    try {
      orders = await getQueuedOrders();
    } catch {
      return;
    }
    const toSync = orders.filter(isOpenQueueRow);
    if (!toSync.length) return;

    setSyncing(true);
    const synced = [];
    for (const rec of toSync) {
      try {
        synced.push(await syncOne(rec));
      } catch (err) {
        const status = err.response?.status;
        const message = err.response?.data?.message || err.message || 'Sync failed';
        if (status && status >= 400 && status < 500 && ![401, 408, 429].includes(status)) {
          await bumpAttempt(rec.localId, message);
        } else {
          await bumpAttempt(rec.localId, message);
          break;
        }
      }
    }
    setSyncing(false);
    await refreshCount();
    if (synced.length > 0 && onSynced) onSynced(synced);
  }, [syncing, syncOne, refreshCount, onSynced]);

  useEffect(() => { refreshCount(); }, [refreshCount]);

  useEffect(() => {
    if (online) flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  return { online, pending, syncing, flush, flushSingle, refreshCount };
}
