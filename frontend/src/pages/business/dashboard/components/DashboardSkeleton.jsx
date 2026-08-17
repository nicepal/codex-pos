import { Box, Card, Group, SimpleGrid, Skeleton, Stack } from '@mantine/core';

function KpiSkeleton() {
  return (
    <Card withBorder padding="md" radius="md">
      <Skeleton height={14} width="60%" />
      <Skeleton height={28} width="80%" mt="sm" />
      <Skeleton height={12} width="50%" mt="sm" />
    </Card>
  );
}

export default function DashboardSkeleton() {
  return (
    <Box>
      <Group justify="space-between" mb="lg" wrap="wrap">
        <Stack gap="xs">
          <Skeleton height={28} width={200} />
          <Skeleton height={16} width={140} />
        </Stack>
        <Skeleton height={36} width={280} />
      </Group>
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md" mb="md">
        {Array.from({ length: 8 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </SimpleGrid>
      <Skeleton height={72} radius="md" mb="md" />
      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Skeleton height={360} radius="md" style={{ gridColumn: 'span 1' }} />
        <Skeleton height={360} radius="md" style={{ gridColumn: 'span 2' }} />
      </SimpleGrid>
    </Box>
  );
}
