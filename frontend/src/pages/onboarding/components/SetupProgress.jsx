import {
  Box, Typography, LinearProgress, Stack, Paper, Alert,
} from '@mui/material';

export default function SetupProgress({ progress, error, running }) {
  const total = progress?.total_products || 0;
  const done = (progress?.products_created || 0) + (progress?.products_skipped || 0);
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : (running ? 15 : 0);

  return (
    <Box maxWidth={560} mx="auto" textAlign="center">
      <Typography variant="h4" fontWeight={800} letterSpacing="-0.03em" gutterBottom>
        Setting up your store…
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        {progress?.message || 'Creating categories, products, and stock. This only takes a moment.'}
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          textAlign: 'left',
        }}
      >
        <LinearProgress
          variant={total > 0 ? 'determinate' : 'indeterminate'}
          value={pct}
          sx={{ height: 10, borderRadius: 999, mb: 2 }}
        />
        <Stack spacing={0.75}>
          <Typography variant="body2">Categories created: {progress?.categories_created ?? 0}{total ? ` / ${progress?.total_categories || '—'}` : ''}</Typography>
          <Typography variant="body2">Products ready: {done}{total ? ` / ${total}` : ''}</Typography>
          <Typography variant="body2">Images attached: {progress?.images_attached ?? 0}</Typography>
          <Typography variant="body2">Stock seeded: {progress?.stock_seeded ?? 0}</Typography>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 3, textAlign: 'left' }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
