import { Group, Stack, Text, Title, Button } from '@mantine/core';

export default function PageHeader({
  title,
  subtitle,
  action,
  actionLabel,
  actionIcon,
  onAction,
  secondaryAction,
}) {
  const defaultAction = actionLabel ? (
    <Button leftSection={actionIcon} onClick={onAction}>
      {actionLabel}
    </Button>
  ) : null;

  const actions =
    action !== undefined ? (
      action
    ) : (
      <Group gap="sm">
        {secondaryAction ? (
          <Button
            variant="default"
            leftSection={secondaryAction.icon}
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        ) : null}
        {defaultAction}
      </Group>
    );

  return (
    <Group justify="space-between" align="flex-start" mb="lg" gap="md" wrap="wrap">
      <Stack gap={4}>
        <Title order={2} fw={700} style={{ fontSize: '1.5rem' }}>
          {title}
        </Title>
        {subtitle ? (
          <Text size="sm" c="dimmed">
            {subtitle}
          </Text>
        ) : null}
      </Stack>
      {actions}
    </Group>
  );
}
