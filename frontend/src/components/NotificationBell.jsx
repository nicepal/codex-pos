import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ActionIcon, Indicator, Menu, Text, Stack, Divider } from '@mantine/core';
import { Notifications } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useRealtime from '../hooks/useRealtime';
import { stripHtmlToText } from '../utils/displayText';

export default function NotificationBell() {
  const [opened, setOpened] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications', { params: { limit: 10 } }).then((r) => r.data),
    refetchInterval: 60000,
  });

  useRealtime(
    'notification',
    useCallback(() => {
      queryClient.invalidateQueries(['notifications']);
    }, [queryClient]),
  );

  const markRead = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const items = data?.data || [];
  const unread = items.filter((n) => !n.read_at && n.status !== 'read').length;

  return (
    <Menu
      opened={opened}
      onChange={setOpened}
      width={320}
      position="bottom-end"
      shadow="md"
      withinPortal
    >
      <Menu.Target>
        <Indicator
          inline
          label={unread > 0 ? unread : undefined}
          size={16}
          color="red"
          disabled={unread === 0}
          processing={unread > 0}
        >
          <ActionIcon variant="subtle" color="gray" aria-label="Notifications">
            <Notifications fontSize="small" />
          </ActionIcon>
        </Indicator>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Notifications</Menu.Label>
        <Divider />
        {items.length === 0 ? (
          <Menu.Item disabled>No notifications</Menu.Item>
        ) : (
          items.map((n) => (
            <Menu.Item
              key={n.id}
              onClick={() => {
                if (!n.read_at) markRead.mutate(n.id);
                if (n.link) {
                  navigate(n.link);
                  setOpened(false);
                }
              }}
            >
              <Stack gap={2}>
                <Text size="sm" fw={n.read_at ? 400 : 700}>
                  {stripHtmlToText(n.title || n.type)}
                </Text>
                {n.message ? (
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {stripHtmlToText(n.message)}
                  </Text>
                ) : null}
              </Stack>
            </Menu.Item>
          ))
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
