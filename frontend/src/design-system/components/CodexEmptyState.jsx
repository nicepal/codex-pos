import { Stack, Text, Title, Center } from '@mantine/core';
import CodexButton from './CodexButton';

/**
 * Lightweight empty/error state for operational screens.
 * Does not replace admin EmptyState (benefits grid) — use that for back-office.
 */
export default function CodexEmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon = null,
}) {
  return (
    <Center py="xl" px="md">
      <Stack align="center" gap="sm" maw={420}>
        {icon}
        <Title order={4} ta="center">{title}</Title>
        {message ? (
          <Text c="dimmed" ta="center" size="sm">
            {message}
          </Text>
        ) : null}
        {actionLabel && onAction ? (
          <CodexButton touch onClick={onAction} mt="xs">
            {actionLabel}
          </CodexButton>
        ) : null}
      </Stack>
    </Center>
  );
}
