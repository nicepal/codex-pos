import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Group, Stack, Text, Title, Badge, ActionIcon, SimpleGrid, Tooltip,
} from '@mantine/core';
import { VolumeUp, VolumeOff, Refresh, WifiOff, Wifi } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { getSocket } from '../../services/realtime';
import { selectAuth } from '../../features/auth/authSlice';
import FeatureGate from '../../components/FeatureGate';
import { CodexSelect } from '../../design-system';
import KDSTicketCard from './KDSTicketCard';

const SOUND_KEY = 'kds_sound_enabled';
const KDS_EVENTS = [
  'kitchen.ticket.created',
  'kitchen.ticket.accepted',
  'kitchen.ticket.started',
  'kitchen.ticket.ready',
  'kitchen.ticket.served',
  'kitchen.ticket.completed',
  'kitchen.ticket.recalled',
  'kitchen.ticket.cancelled',
];

function playNewTicketSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.35);
  } catch (_) { /* optional */ }
}

export default function KDSPage() {
  const queryClient = useQueryClient();
  const { tenant } = useSelector(selectAuth);
  const [branchId, setBranchId] = useState('');
  const [stationId, setStationId] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [newTicketIds, setNewTicketIds] = useState(new Set());
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem(SOUND_KEY) !== 'false');
  const prevTicketCount = useRef(0);

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches', { params: { limit: 50 } }).then((r) => r.data.data),
  });

  const effectiveBranchId = branchId || branches?.[0]?.id || '';

  const { data: settings } = useQuery({
    queryKey: ['restaurant-settings'],
    queryFn: () => api.get('/restaurant/settings').then((r) => r.data.data),
  });

  const { data: stations } = useQuery({
    queryKey: ['kds-stations', effectiveBranchId],
    queryFn: () => api.get('/restaurant/kds/stations', {
      params: { branch_id: effectiveBranchId },
    }).then((r) => r.data.data),
    enabled: Boolean(effectiveBranchId),
  });

  const { data: tickets = [], isFetching, refetch } = useQuery({
    queryKey: ['kds-tickets', effectiveBranchId, stationId],
    queryFn: () => api.get('/restaurant/kds/tickets', {
      params: {
        branch_id: effectiveBranchId,
        station_id: stationId || undefined,
        active_only: 'true',
      },
    }).then((r) => r.data.data),
    enabled: Boolean(effectiveBranchId),
    refetchInterval: (settings?.auto_refresh_seconds || 30) * 1000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['kds-tickets'] });
  }, [queryClient]);

  useEffect(() => {
    if (!tenant?.id || !effectiveBranchId) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;
    setSocketConnected(socket.connected);
    socket.emit('join-branch', { tenantId: tenant.id, branchId: effectiveBranchId });
    KDS_EVENTS.forEach((ev) => socket.on(ev, invalidate));
    const onConnect = () => {
      setSocketConnected(true);
      refetch();
    };
    const onDisconnect = () => setSocketConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      KDS_EVENTS.forEach((ev) => socket.off(ev, invalidate));
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [tenant?.id, effectiveBranchId, invalidate, refetch]);

  useEffect(() => {
    const on = () => { setOnline(true); refetch(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [refetch]);

  useEffect(() => {
    const pending = tickets.filter((t) => t.status === 'pending');
    if (pending.length > prevTicketCount.current && soundOn && settings?.sound_enabled !== false) {
      playNewTicketSound();
      setNewTicketIds(new Set(pending.map((t) => t.id)));
      setTimeout(() => setNewTicketIds(new Set()), 5000);
    }
    prevTicketCount.current = pending.length;
  }, [tickets, soundOn, settings?.sound_enabled]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem(SOUND_KEY, String(next));
  };

  const columns = useMemo(() => ({
    pending: tickets.filter((t) => t.status === 'pending'),
    accepted: tickets.filter((t) => t.status === 'accepted'),
    preparing: tickets.filter((t) => t.status === 'preparing'),
    ready: tickets.filter((t) => t.status === 'ready'),
  }), [tickets]);

  const action = async (method, id) => {
    setBusyId(id);
    try {
      await api.post(`/restaurant/kds/tickets/${id}/${method}`, { branch_id: effectiveBranchId });
      invalidate();
    } finally {
      setBusyId(null);
    }
  };

  const branchOptions = (branches || []).map((b) => ({ value: String(b.id), label: b.name }));
  const stationOptions = [
    { value: '', label: 'All stations' },
    ...(stations || []).map((s) => ({ value: String(s.id), label: s.name })),
  ];

  const selectStyles = {
    input: {
      background: '#21262d',
      color: '#e6edf3',
      borderColor: '#30363d',
    },
    label: { color: '#8b949e' },
  };

  return (
    <FeatureGate pack="restaurant_pro">
      <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 16 }}>
        <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
          <Group gap="sm">
            <Title order={2} c="#e6edf3" style={{ fontWeight: 800 }}>Kitchen Display</Title>
            {!online && (
              <Badge leftSection={<WifiOff style={{ fontSize: 14 }} />} color="yellow">Offline</Badge>
            )}
            {online && (
              <Badge
                leftSection={socketConnected ? <Wifi style={{ fontSize: 14 }} /> : <WifiOff style={{ fontSize: 14 }} />}
                color={socketConnected ? 'teal' : 'yellow'}
                variant="outline"
              >
                {socketConnected ? 'Live' : 'Reconnecting…'}
              </Badge>
            )}
            {isFetching && <Badge variant="outline" color="gray">Syncing…</Badge>}
          </Group>
          <Group gap="sm" align="flex-end">
            <CodexSelect
              label="Branch"
              maw={180}
              data={branchOptions}
              value={effectiveBranchId ? String(effectiveBranchId) : null}
              onChange={(v) => setBranchId(v || '')}
              styles={selectStyles}
            />
            <CodexSelect
              label="Station"
              maw={160}
              data={stationOptions}
              value={stationId}
              onChange={(v) => setStationId(v || '')}
              styles={selectStyles}
            />
            <Tooltip label={soundOn ? 'Mute new ticket sound' : 'Enable sound'}>
              <ActionIcon variant="subtle" c="#e6edf3" size="lg" onClick={toggleSound}>
                {soundOn ? <VolumeUp /> : <VolumeOff />}
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Refresh">
              <ActionIcon variant="subtle" c="#e6edf3" size="lg" onClick={() => refetch()}>
                <Refresh />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" style={{ flex: 1, minHeight: 0 }}>
          {[
            { key: 'pending', title: 'NEW', color: '#58a6ff' },
            { key: 'accepted', title: 'ACCEPTED', color: '#a371f7' },
            { key: 'preparing', title: 'PREPARING', color: '#d29922' },
            { key: 'ready', title: 'READY', color: '#3fb950' },
          ].map((col) => (
            <Box key={col.key} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <Text
                size="xs"
                fw={800}
                tt="uppercase"
                mb="sm"
                lts={2}
                style={{ color: col.color }}
              >
                {col.title} ({columns[col.key].length})
              </Text>
              <Box style={{ flex: 1, overflow: 'auto', paddingRight: 4 }}>
                {columns[col.key].map((ticket) => (
                  <KDSTicketCard
                    key={ticket.id}
                    ticket={ticket}
                    warningMinutes={settings?.warning_after_minutes ?? 8}
                    overdueMinutes={settings?.overdue_after_minutes ?? 15}
                    isNew={newTicketIds.has(ticket.id)}
                    busy={busyId === ticket.id}
                    onAccept={(id) => action('accept', id)}
                    onStart={(id) => action('start', id)}
                    onReady={(id) => action('ready', id)}
                    onComplete={(id) => action('complete', id)}
                    onRecall={(id) => action('recall', id)}
                  />
                ))}
                {!columns[col.key].length && (
                  <Text size="sm" c="#8b949e" ta="center" py="xl">
                    No tickets
                  </Text>
                )}
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      </Box>
    </FeatureGate>
  );
}
