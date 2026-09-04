import { Box, Button, Paper, Text, Title, Stack, Group } from '@mantine/core';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import useTenantFeatures from '../hooks/useTenantFeatures';
import { FEATURE_PACKS } from '../config/featurePackLabels';
import { getRequiredFeaturesForPath } from '../config/featureNav';
import LoadingState from './LoadingState';

function PackRequiredMessage({ packKeys }) {
  const { packs } = useTenantFeatures();
  const keys = Array.isArray(packKeys) ? packKeys : [packKeys];
  const primary = keys[0];
  const meta = packs[primary] || FEATURE_PACKS[primary] || { label: primary, description: '' };
  const labels = keys
    .map((k) => (packs[k] || FEATURE_PACKS[k])?.label || k)
    .join(' or ');

  return (
    <Box maw={520} mx="auto" mt="xl" px="md">
      <Paper withBorder p="lg" radius="md" shadow="sm">
        <Stack gap="sm">
          <Title order={4}>{labels} required</Title>
          <Text c="dimmed" size="sm">
            {meta.description
              || 'This module needs a feature pack that is not enabled on your plan.'}
            {' '}
            Enable it in Settings, or upgrade your subscription if it is not available.
          </Text>
          <Group gap="sm" mt="xs">
            <Button component={RouterLink} to="/settings" w="fit-content">
              Open Settings
            </Button>
            <Button component={RouterLink} to="/subscription" variant="light" w="fit-content">
              View subscription
            </Button>
            <Button component={RouterLink} to="/dashboard" variant="subtle" w="fit-content">
              Back to dashboard
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Box>
  );
}

/**
 * Gate children behind one or more feature packs.
 * Shows a loading state (never blank) while features load.
 */
export default function FeatureGate({ pack, anyOf, children, fallback = null }) {
  const { hasFeature, isLoading } = useTenantFeatures();
  const required = anyOf?.length ? anyOf : (pack ? [pack] : []);

  if (!required.length) return children;
  if (isLoading) return <LoadingState message="Loading…" />;
  if (required.some((key) => hasFeature(key))) return children;
  if (fallback !== null) return fallback;

  return <PackRequiredMessage packKeys={required} />;
}

/**
 * Auto-gates the current route using NAV_FEATURE_MAP.
 * Use around BusinessLayout <Outlet /> so direct URLs never blank out.
 */
export function RouteFeatureGate({ children }) {
  const location = useLocation();
  const required = getRequiredFeaturesForPath(location.pathname);
  if (!required?.length) return children;
  return <FeatureGate anyOf={required}>{children}</FeatureGate>;
}
