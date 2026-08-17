import { Box, Button, Paper, Text, Title, Stack } from '@mantine/core';
import { Link as RouterLink } from 'react-router-dom';
import useTenantFeatures from '../hooks/useTenantFeatures';
import { FEATURE_PACKS } from '../config/featurePackLabels';

export default function FeatureGate({ pack, children, fallback = null }) {
  const { hasFeature, isLoading, packs } = useTenantFeatures();

  if (isLoading) return null;
  if (hasFeature(pack)) return children;

  if (fallback !== null) return fallback;

  const meta = packs[pack] || FEATURE_PACKS[pack] || { label: pack, description: '' };

  return (
    <Box maw={520} mx="auto" mt="xl" p="md">
      <Paper withBorder p="lg" radius="md" shadow="sm">
        <Stack gap="sm">
          <Title order={4}>{meta.label || pack} required</Title>
          <Text c="dimmed" size="sm">
            {meta.description || 'Enable this feature pack in Settings to use this capability.'}
          </Text>
          <Button component={RouterLink} to="/settings" w="fit-content">
            Open Settings
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
