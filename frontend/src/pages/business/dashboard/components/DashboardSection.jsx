import { Card, Group, Stack, Text, Title, Alert, Button, Skeleton, Box } from '@mantine/core';
import { Refresh } from '@mui/icons-material';

export default function DashboardSection({
  title,
  subtitle,
  action,
  loading,
  error,
  onRetry,
  children,
  noPadding,
}) {
  return (
    <Card withBorder padding={noPadding ? 0 : 'md'} radius="md" shadow="sm" h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
      <Stack gap="md" style={{ flex: 1 }} p={noPadding ? 'md' : 0} pt={noPadding ? 'md' : undefined}>
        {(title || action) ? (
          <Group justify="space-between" align="flex-start" wrap="wrap" px={noPadding ? 0 : undefined}>
            <Stack gap={2}>
              {title ? (
                <Title order={4} fw={700}>
                  {title}
                </Title>
              ) : null}
              {subtitle ? (
                <Text size="sm" c="dimmed">
                  {subtitle}
                </Text>
              ) : null}
            </Stack>
            {action}
          </Group>
        ) : null}

        {error ? (
          <Alert
            color="red"
            variant="light"
          >
            <Group justify="space-between" wrap="wrap" gap="sm">
              <span>{error}</span>
              {onRetry ? (
                <Button
                  size="compact-sm"
                  variant="subtle"
                  color="red"
                  leftSection={<Refresh fontSize="small" />}
                  onClick={onRetry}
                >
                  Retry
                </Button>
              ) : null}
            </Group>
          </Alert>
        ) : null}

        {loading ? (
          <Box>
            <Skeleton height={120} radius="md" />
            <Skeleton height={12} mt="sm" />
            <Skeleton height={12} mt={6} width="60%" />
          </Box>
        ) : (
          children
        )}
      </Stack>
    </Card>
  );
}
