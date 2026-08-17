import { Group, Text } from '@mantine/core';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';
import { CODEX_TOKENS } from '../../../../design-system';

const TREND_CONFIG = {
  up: { color: CODEX_TOKENS.success, Icon: TrendingUp, prefix: '↑' },
  down: { color: CODEX_TOKENS.error, Icon: TrendingDown, prefix: '↓' },
  flat: { color: 'var(--mantine-color-dimmed)', Icon: TrendingFlat, prefix: '—' },
};

export default function TrendBadge({ changePercent, comparisonLabel, trend = 'flat', size = 'small' }) {
  const config = TREND_CONFIG[trend] || TREND_CONFIG.flat;
  const abs = Math.abs(changePercent ?? 0);
  const fontSize = size === 'small' ? 'xs' : 'sm';
  const iconSize = size === 'small' ? 14 : 18;

  return (
    <Group gap={4} mt={4} wrap="nowrap">
      <config.Icon style={{ fontSize: iconSize, color: config.color }} />
      <Text size={fontSize} fw={600} style={{ color: config.color }}>
        {config.prefix} {abs}%
      </Text>
      {comparisonLabel ? (
        <Text size={fontSize} c="dimmed">
          {comparisonLabel}
        </Text>
      ) : null}
    </Group>
  );
}
