import { Card, Group, Stack, Text, UnstyledButton, Box } from '@mantine/core';
import TrendBadge from './TrendBadge';

export default function KpiCard({ title, value, icon, kpi, onClick, formatValue }) {
  const displayValue = formatValue
    ? formatValue(kpi?.value ?? value)
    : (value ?? kpi?.value ?? '—');

  const content = (
    <Box p="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
          <Text size="sm" c="dimmed" lineClamp={1}>
            {title}
          </Text>
          <Text fw={700} style={{ fontSize: '1.35rem', lineHeight: 1.2 }}>
            {displayValue}
          </Text>
          {kpi ? (
            <TrendBadge
              changePercent={kpi.changePercent}
              comparisonLabel={kpi.comparisonLabel}
              trend={kpi.trend}
            />
          ) : null}
        </Stack>
        {icon ? <Box style={{ opacity: 0.85, flexShrink: 0 }}>{icon}</Box> : null}
      </Group>
    </Box>
  );

  if (onClick) {
    return (
      <Card withBorder padding={0} radius="md" shadow="sm" h="100%">
        <UnstyledButton onClick={onClick} w="100%" h="100%" style={{ display: 'block' }}>
          {content}
        </UnstyledButton>
      </Card>
    );
  }

  return (
    <Card withBorder padding={0} radius="md" shadow="sm" h="100%">
      {content}
    </Card>
  );
}
