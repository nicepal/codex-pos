import { Card, Group, Stack, Text, ThemeIcon } from '@mantine/core';

export default function StatCard({ title, value, icon, subtitle, color }) {
  return (
    <Card withBorder padding="lg" radius="md" shadow="sm">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4} style={{ minWidth: 0 }}>
          <Text size="sm" c="dimmed">
            {title}
          </Text>
          <Text fw={700} size="xl" c={color || undefined} style={{ fontSize: '1.75rem', lineHeight: 1.2 }}>
            {value}
          </Text>
          {subtitle ? (
            <Text size="xs" c="dimmed">
              {subtitle}
            </Text>
          ) : null}
        </Stack>
        {icon ? (
          <ThemeIcon variant="light" color="codex" size="lg" radius="md">
            {icon}
          </ThemeIcon>
        ) : null}
      </Group>
    </Card>
  );
}
