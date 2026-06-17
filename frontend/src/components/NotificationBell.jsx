import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconButton, Badge, Menu, MenuItem, Typography, Box, Divider } from '@mui/material';
import { Notifications } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useRealtime from '../hooks/useRealtime';

export default function NotificationBell() {
  const [anchor, setAnchor] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications', { params: { limit: 10 } }).then((r) => r.data),
    refetchInterval: 60000,
  });

  // Live push: refresh immediately when the server emits a new notification
  useRealtime('notification', useCallback(() => {
    queryClient.invalidateQueries(['notifications']);
  }, [queryClient]));

  const markRead = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const items = data?.data || [];
  const unread = items.filter((n) => !n.read_at && n.status !== 'read').length;

  return (
    <>
      <IconButton color="inherit" onClick={(e) => setAnchor(e.currentTarget)}>
        <Badge badgeContent={unread} color="error">
          <Notifications />
        </Badge>
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} PaperProps={{ sx: { width: 320 } }}>
        <Box sx={{ px: 2, py: 1 }}><Typography fontWeight={600}>Notifications</Typography></Box>
        <Divider />
        {items.length === 0 && <MenuItem disabled>No notifications</MenuItem>}
        {items.map((n) => (
          <MenuItem key={n.id} onClick={() => { if (!n.read_at) markRead.mutate(n.id); }}>
            <Box>
              <Typography variant="body2" fontWeight={n.read_at ? 400 : 700}>{n.title || n.type}</Typography>
              <Typography variant="caption" color="text.secondary">{n.message}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
