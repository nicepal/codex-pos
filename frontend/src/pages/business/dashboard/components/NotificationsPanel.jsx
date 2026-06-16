import { Box, Typography, List, ListItem, ListItemText, Chip, Tabs, Tab } from '@mui/material';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../services/api';
import DashboardSection from './DashboardSection';
import EmptyState from '../../../../components/EmptyState';

const GROUPS = [
  { key: 'inventory', label: 'Inventory' },
  { key: 'orders', label: 'Orders' },
  { key: 'payments', label: 'Payments' },
  { key: 'subscription', label: 'Subscription' },
];

export default function NotificationsPanel({ notifications, loading, error, onRetry }) {
  const [tab, setTab] = useState(0);
  const queryClient = useQueryClient();
  const groupKey = GROUPS[tab]?.key;
  const items = notifications?.[groupKey] || [];

  const markRead = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries(['dashboard-overview']),
  });

  return (
    <DashboardSection title="Notifications Center" loading={loading} error={error} onRetry={onRetry}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, minHeight: 36 }}>
        {GROUPS.map((g) => (
          <Tab
            key={g.key}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {g.label}
                {(notifications?.[g.key]?.length > 0) && (
                  <Chip label={notifications[g.key].length} size="small" sx={{ height: 18, fontSize: 11 }} />
                )}
              </Box>
            }
          />
        ))}
      </Tabs>

      {!loading && items.length === 0 && (
        <EmptyState compact illustration="store" title="No notifications" message={`No ${GROUPS[tab].label.toLowerCase()} alerts right now.`} />
      )}

      {!loading && items.length > 0 && (
        <List disablePadding dense>
          {items.map((n) => (
            <ListItem
              key={n.id}
              sx={{
                bgcolor: n.readAt ? 'transparent' : 'action.hover',
                borderRadius: 1,
                mb: 0.5,
                cursor: 'pointer',
              }}
              onClick={() => !n.readAt && markRead.mutate(n.id)}
            >
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={n.readAt ? 400 : 700}>
                    {n.title || n.type}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {n.message} · {new Date(n.createdAt).toLocaleString()}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </DashboardSection>
  );
}
