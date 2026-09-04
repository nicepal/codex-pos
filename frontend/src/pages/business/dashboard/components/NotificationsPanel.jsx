import { Box, Text, Stack, Badge, Tabs, Group } from '@mantine/core';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../services/api';
import DashboardSection from './DashboardSection';
import EmptyState from '../../../../components/EmptyState';
import { stripHtmlToText } from '../../../../utils/displayText';

const GROUPS = [
  { key: 'inventory', label: 'Inventory' },
  { key: 'orders', label: 'Orders' },
  { key: 'payments', label: 'Payments' },
  { key: 'subscription', label: 'Subscription' },
];

export default function NotificationsPanel({ notifications, loading, error, onRetry }) {
  const [tab, setTab] = useState('inventory');
  const queryClient = useQueryClient();
  const items = notifications?.[tab] || [];

  const markRead = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries(['dashboard-overview']),
  });

  return (
    <DashboardSection title="Notifications Center" loading={loading} error={error} onRetry={onRetry}>
      <Tabs value={tab} onChange={setTab} mb="md">
        <Tabs.List>
          {GROUPS.map((g) => (
            <Tabs.Tab
              key={g.key}
              value={g.key}
              rightSection={
                notifications?.[g.key]?.length > 0 ? (
                  <Badge size="xs" circle>
                    {notifications[g.key].length}
                  </Badge>
                ) : null
              }
            >
              {g.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      {!loading && items.length === 0 ? (
        <EmptyState
          compact
          illustration="store"
          title="No notifications"
          message={`No ${GROUPS.find((g) => g.key === tab)?.label.toLowerCase()} alerts right now.`}
        />
      ) : null}

      {!loading && items.length > 0 ? (
        <Stack gap="xs">
          {items.map((n) => (
            <Box
              key={n.id}
              p="sm"
              style={{
                background: n.readAt ? 'transparent' : 'var(--mantine-color-default-hover)',
                borderRadius: 8,
                cursor: 'pointer',
              }}
              onClick={() => !n.readAt && markRead.mutate(n.id)}
            >
              <Text size="sm" fw={n.readAt ? 400 : 700}>
                {stripHtmlToText(n.title || n.type)}
              </Text>
              <Text size="xs" c="dimmed">
                {stripHtmlToText(n.message)} · {new Date(n.createdAt).toLocaleString()}
              </Text>
            </Box>
          ))}
        </Stack>
      ) : null}
    </DashboardSection>
  );
}
