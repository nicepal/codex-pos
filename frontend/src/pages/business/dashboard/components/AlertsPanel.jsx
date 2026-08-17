import { Box, Group, Stack, Text, NavLink, Badge } from '@mantine/core';
import {
  ErrorOutline, WarningAmber, CheckCircle, ChevronRight,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { CODEX_TOKENS } from '../../../../design-system';
import DashboardSection from './DashboardSection';

const SEVERITY = {
  critical: { color: 'red', iconColor: CODEX_TOKENS.error, Icon: ErrorOutline },
  warning: { color: 'yellow', iconColor: CODEX_TOKENS.warning, Icon: WarningAmber },
  good: { color: 'green', iconColor: CODEX_TOKENS.success, Icon: CheckCircle },
};

export default function AlertsPanel({ alerts, loading, error, onRetry }) {
  const navigate = useNavigate();
  const actionable = (alerts || []).filter((a) => a.type !== 'all_clear');
  const allClear = !actionable.length;

  return (
    <DashboardSection title="Business Alerts" loading={loading} error={error} onRetry={onRetry}>
      {!loading && allClear ? (
        <Group gap="md" py="md" wrap="nowrap">
          <CheckCircle style={{ fontSize: 32, color: CODEX_TOKENS.success }} />
          <Stack gap={2}>
            <Text fw={700} size="sm">
              All clear
            </Text>
            <Text size="sm" c="dimmed">
              No actions needed right now. Your business is running smoothly.
            </Text>
          </Stack>
        </Group>
      ) : null}
      {!loading && actionable.length > 0
        ? actionable.map((alert) => {
            const cfg = SEVERITY[alert.severity] || SEVERITY.warning;
            return (
              <NavLink
                key={alert.id}
                label={alert.title}
                description={
                  alert.type === 'subscription_expiry'
                    ? `${alert.count} day${alert.count !== 1 ? 's' : ''} remaining`
                    : `${alert.count} item${alert.count !== 1 ? 's' : ''}`
                }
                leftSection={<cfg.Icon style={{ color: cfg.iconColor, fontSize: 18 }} />}
                rightSection={
                  <Group gap={4} wrap="nowrap">
                    <Badge size="sm" variant="outline" color={cfg.color}>
                      {alert.severity}
                    </Badge>
                    {alert.href ? <ChevronRight fontSize="small" /> : null}
                  </Group>
                }
                onClick={() => alert.href && navigate(alert.href)}
                disabled={!alert.href}
                mb={4}
              />
            );
          })
        : null}
    </DashboardSection>
  );
}
