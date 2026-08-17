import {
  ShoppingCart, Inventory, SwapHoriz, Person, Receipt,
} from '@mui/icons-material';
import { Text, Box, Group, Avatar, Stack, Divider } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { CODEX_TOKENS } from '../../../../design-system';
import DashboardSection from './DashboardSection';
import EmptyState from '../../../../components/EmptyState';

const TYPE_ICONS = {
  sale: ShoppingCart,
  product: Inventory,
  stock: SwapHoriz,
  purchase_order: Receipt,
  customer: Person,
};

const TYPE_COLORS = {
  sale: CODEX_TOKENS.primary,
  product: '#7c3aed',
  stock: '#3b82f6',
  purchase_order: CODEX_TOKENS.warning,
  customer: CODEX_TOKENS.success,
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ActivityTimeline({ activity, loading, error, onRetry }) {
  const navigate = useNavigate();

  return (
    <DashboardSection title="Recent Activity" loading={loading} error={error} onRetry={onRetry}>
      {!loading && !activity?.length ? (
        <EmptyState
          compact
          illustration="store"
          title="No recent activity"
          message="Business activity will show here."
        />
      ) : null}
      {!loading && activity?.length > 0
        ? activity.map((item, i) => {
            const Icon = TYPE_ICONS[item.type] || Receipt;
            const color = TYPE_COLORS[item.type] || CODEX_TOKENS.primary;
            return (
              <Box key={`${item.id}-${i}`}>
                <Group
                  align="flex-start"
                  wrap="nowrap"
                  gap="sm"
                  py="sm"
                  style={{ cursor: item.href ? 'pointer' : 'default' }}
                  onClick={() => item.href && navigate(item.href)}
                >
                  <Avatar size={36} radius="xl" style={{ background: `${color}22`, color }}>
                    <Icon style={{ fontSize: 18 }} />
                  </Avatar>
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Group justify="space-between" wrap="nowrap" gap="sm">
                      <Text size="sm" fw={600} lineClamp={1}>
                        {item.title}
                      </Text>
                      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                        {timeAgo(item.createdAt)}
                      </Text>
                    </Group>
                    {item.description ? (
                      <Text size="sm" c="dimmed" lineClamp={2}>
                        {item.description}
                      </Text>
                    ) : null}
                  </Stack>
                </Group>
                {i < activity.length - 1 ? <Divider /> : null}
              </Box>
            );
          })
        : null}
    </DashboardSection>
  );
}
