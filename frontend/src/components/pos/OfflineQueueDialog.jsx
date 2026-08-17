import { useEffect, useState } from 'react';
import {
  Stack, Text, Group, Alert, Badge, Box, Divider, Center, Loader, ActionIcon, Textarea,
} from '@mantine/core';
import { CloudOff, Sync, DeleteOutline, Edit, Replay } from '@mui/icons-material';
import { CodexModal, CodexButton, CodexInput } from '../../design-system';
import {
  getQueuedOrders,
  removeQueuedOrder,
  dismissQueuedOrder,
  updateQueuedOrderPayload,
} from '../../utils/offlineQueue';
import { friendlyPosError } from './posErrors';

function statusMeta(rec) {
  if (rec.syncStatus === 'synced') {
    return { label: 'SYNCED', color: 'teal' };
  }
  if (rec.syncStatus === 'dismissed') {
    return { label: 'DISMISSED', color: 'gray' };
  }
  if (rec.syncStatus === 'failed' || (rec.attempts || 0) >= 5) {
    return { label: 'FAILED', color: 'red' };
  }
  return { label: 'PENDING SYNC', color: 'yellow' };
}

function isFailed(rec) {
  return rec.syncStatus === 'failed' || (rec.attempts || 0) >= 5;
}

/**
 * Shows locally queued offline sales. Sync is real POST /orders — no fake server receipts.
 */
export default function OfflineQueueDialog({
  open,
  onClose,
  formatMoney,
  syncing = false,
  onRetrySync,
  onRetrySingle,
  onOpenSyncedReceipt,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editJson, setEditJson] = useState('');
  const [dismissId, setDismissId] = useState(null);
  const [dismissReason, setDismissReason] = useState('');
  const [actionError, setActionError] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await getQueuedOrders();
      setRows((list || []).sort((a, b) => (
        Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0)
      )));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setEditId(null);
      setDismissId(null);
      setActionError('');
      refresh();
    }
  }, [open, syncing]);

  const hardRemove = async (localId) => {
    await removeQueuedOrder(localId);
    refresh();
  };

  const saveEdit = async () => {
    setActionError('');
    try {
      const parsed = JSON.parse(editJson);
      await updateQueuedOrderPayload(editId, parsed);
      setEditId(null);
      refresh();
    } catch (err) {
      setActionError(friendlyPosError(err, 'Invalid JSON or update failed'));
    }
  };

  const confirmDismiss = async () => {
    if (!dismissId) return;
    await dismissQueuedOrder(dismissId, dismissReason);
    setDismissId(null);
    setDismissReason('');
    refresh();
  };

  const pendingCount = rows.filter(
    (r) => r.syncStatus !== 'synced' && r.syncStatus !== 'dismissed' && !isFailed(r)
  ).length;

  return (
    <CodexModal
      opened={open}
      onClose={onClose}
      size="md"
      title={
        <Group gap="xs">
          <CloudOff />
          <span>Offline queue</span>
        </Group>
      }
    >
      <Stack gap="md">
        <Alert color="yellow">
          Offline sales are stored on this device only until sync succeeds.
          FAILED items can be retried, edited, or dismissed with a reason.
        </Alert>
        {actionError && <Alert color="red">{actionError}</Alert>}
        {loading ? (
          <Center py="xl"><Loader size="sm" /></Center>
        ) : rows.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            No offline sales on this device
          </Text>
        ) : (
          <Stack gap="sm">
            {rows.map((rec) => {
              const p = rec.payload || {};
              const totalHint = p.payments?.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0)
                || parseFloat(p.total_amount)
                || null;
              const meta = statusMeta(rec);
              const failed = isFailed(rec);
              return (
                <Group
                  key={rec.localId}
                  align="flex-start"
                  justify="space-between"
                  wrap="nowrap"
                  py="xs"
                  style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
                >
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <Group gap="xs" mb={4}>
                      <Text size="sm" fw={700}>
                        {p.client_order_id || rec.localId}
                      </Text>
                      <Badge size="sm" color={meta.color}>{meta.label}</Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {new Date(rec.createdAt).toLocaleString()}
                      {p.payment_method ? ` · ${p.payment_method}` : ''}
                      {totalHint != null && formatMoney ? ` · ~${formatMoney(totalHint)}` : ''}
                      {rec.attempts ? ` · attempts ${rec.attempts}` : ''}
                      {rec.syncedOrderId ? ` · order ${rec.syncedOrderId.slice(0, 8)}…` : ''}
                    </Text>
                    {rec.dismissReason && (
                      <Text size="xs" c="dimmed">Dismissed: {rec.dismissReason}</Text>
                    )}
                    {rec.lastError && (
                      <Text size="xs" c="red">
                        {friendlyPosError({ message: rec.lastError }, rec.lastError)}
                      </Text>
                    )}
                  </Box>
                  <Stack gap={4}>
                    {rec.syncStatus === 'synced' && rec.syncedOrderId && (
                      <CodexButton
                        size="compact-sm"
                        variant="outline"
                        onClick={() => onOpenSyncedReceipt?.(rec.syncedOrderId)}
                      >
                        Receipt
                      </CodexButton>
                    )}
                    {failed && rec.syncStatus !== 'dismissed' && (
                      <>
                        <CodexButton
                          size="compact-sm"
                          variant="outline"
                          leftSection={<Replay fontSize="small" />}
                          disabled={syncing}
                          onClick={async () => {
                            setActionError('');
                            try {
                              await onRetrySingle?.(rec.localId);
                              refresh();
                            } catch (err) {
                              setActionError(friendlyPosError(err, 'Retry failed'));
                              refresh();
                            }
                          }}
                        >
                          Retry
                        </CodexButton>
                        <ActionIcon
                          variant="subtle"
                          aria-label="Edit payload"
                          onClick={() => {
                            setEditId(rec.localId);
                            setEditJson(JSON.stringify(rec.payload || {}, null, 2));
                          }}
                        >
                          <Edit fontSize="small" />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label="Dismiss with reason"
                          onClick={() => {
                            setDismissId(rec.localId);
                            setDismissReason('');
                          }}
                        >
                          <DeleteOutline fontSize="small" />
                        </ActionIcon>
                      </>
                    )}
                    {(rec.syncStatus === 'synced' || rec.syncStatus === 'dismissed') && (
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label="Remove"
                        onClick={() => hardRemove(rec.localId)}
                      >
                        <DeleteOutline fontSize="small" />
                      </ActionIcon>
                    )}
                  </Stack>
                </Group>
              );
            })}
          </Stack>
        )}

        {editId && (
          <Box>
            <Text fw={700} size="sm" mb="xs">Edit order payload (JSON)</Text>
            <Textarea
              minRows={6}
              value={editJson}
              onChange={(e) => setEditJson(e.target.value)}
              autosize
            />
            <Group gap="sm" mt="sm">
              <CodexButton size="compact-sm" variant="default" onClick={() => setEditId(null)}>
                Cancel
              </CodexButton>
              <CodexButton size="compact-sm" color="codex" onClick={saveEdit}>
                Save
              </CodexButton>
            </Group>
          </Box>
        )}

        {dismissId && (
          <Box>
            <Text fw={700} size="sm" mb="xs">Dismiss reason</Text>
            <CodexInput
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              placeholder="e.g. duplicate test sale"
            />
            <Group gap="sm" mt="sm">
              <CodexButton size="compact-sm" variant="default" onClick={() => setDismissId(null)}>
                Cancel
              </CodexButton>
              <CodexButton size="compact-sm" color="red" onClick={confirmDismiss}>
                Dismiss
              </CodexButton>
            </Group>
          </Box>
        )}

        <Divider />

        <Group justify="flex-end" gap="sm">
          <CodexButton variant="default" onClick={onClose} touch>
            Close
          </CodexButton>
          <CodexButton
            color="codex"
            leftSection={syncing ? <Loader size={16} color="white" /> : <Sync fontSize="small" />}
            disabled={syncing || pendingCount === 0}
            onClick={() => onRetrySync?.()}
            touch
          >
            {syncing ? 'Syncing…' : 'Retry sync'}
          </CodexButton>
        </Group>
      </Stack>
    </CodexModal>
  );
}
