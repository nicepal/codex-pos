import {
  Card, CardContent, Typography, LinearProgress, Box, Stack, Chip,
} from '@mui/material';
import ImportSummary from './ImportSummary';

const STATUS_COLOR = {
  queued: 'default',
  running: 'info',
  completed: 'success',
  failed: 'error',
};

export default function ImportProgress({ job }) {
  if (!job) return null;
  const progress = job.progress || 0;
  const indeterminate = job.status === 'running' && job.phase === 'exporting';
  const totals = job.totals || {};

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6">
            {job.type === 'incremental' ? 'Sync in progress' : 'Import in progress'}
          </Typography>
          <Chip size="small" label={job.status} color={STATUS_COLOR[job.status] || 'default'} />
        </Stack>

        <Box sx={{ mb: 1 }}>
          <LinearProgress
            variant={indeterminate ? 'indeterminate' : 'determinate'}
            value={progress}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          {job.phase === 'exporting'
            ? `Exporting from Shopify… ${job.objectCount ? `${job.objectCount} objects` : ''}`
            : `${progress}% complete`}
        </Typography>

        {job.status === 'failed' && job.error && (
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>{job.error}</Typography>
        )}

        <ImportSummary totals={totals} />
      </CardContent>
    </Card>
  );
}
