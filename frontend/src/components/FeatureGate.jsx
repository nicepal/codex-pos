import { Box, Button, Paper, Typography } from '@mui/material';
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
    <Box sx={{ p: 4, maxWidth: 520, mx: 'auto', mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {meta.label || pack} required
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {meta.description || 'Enable this feature pack in Settings to use this capability.'}
        </Typography>
        <Button component={RouterLink} to="/settings" variant="contained">
          Open Settings
        </Button>
      </Paper>
    </Box>
  );
}
