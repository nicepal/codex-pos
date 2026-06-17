import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { getQueuedOrders, removeQueuedOrder, bumpAttempt } from '../utils/offlineQueue';
import useOnlineStatus from './useOnlineStatus';

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
      const orders = await getQueuedOrders();
      setPending(orders.length);
      return orders.length;
    } catch {
      return 0;
    }
  }, []);

  const flush = useCallback(async () => {
    if (syncing) return;
    let orders;
    try {
      orders = await getQueuedOrders();
    } catch {
      return;
    }
    if (!orders.length) return;

    setSyncing(true);
    let syncedCount = 0;
    for (const rec of orders) {
      try {
        await api.post('/orders', rec.payload);
        await removeQueuedOrder(rec.localId);
        syncedCount += 1;
      } catch (err) {
        // Validation/permanent errors (4xx except 401/408/429) should not loop forever
        const status = err.response?.status;
        if (status && status >= 400 && status < 500 && ![401, 408, 429].includes(status)) {
          await bumpAttempt(rec.localId, err.response?.data?.message || 'Rejected');
          // Drop after repeated permanent failures to avoid a stuck queue
          if ((rec.attempts || 0) >= 4) await removeQueuedOrder(rec.localId);
        } else {
          await bumpAttempt(rec.localId, err.message);
          break; // network still down; stop and retry later
        }
      }
    }
    setSyncing(false);
    await refreshCount();
    if (syncedCount > 0 && onSynced) onSynced(syncedCount);
  }, [syncing, refreshCount, onSynced]);

  useEffect(() => { refreshCount(); }, [refreshCount]);

  useEffect(() => {
    if (online) flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  return { online, pending, syncing, flush, refreshCount };
}
