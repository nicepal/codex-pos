import {
  Card, CardContent, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip, Box,
} from '@mui/material';

const STATUS_COLOR = {
  queued: 'default',
  running: 'info',
  completed: 'success',
  failed: 'error',
};

function formatDuration(ms) {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export default function ImportHistoryTable({ jobs }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Import history</Typography>
        {(!jobs || jobs.length === 0) ? (
          <Typography color="text.secondary" variant="body2">No imports yet.</Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Imported</TableCell>
                  <TableCell align="right">Updated</TableCell>
                  <TableCell align="right">Variants</TableCell>
                  <TableCell align="right">Errors</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Duration</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((j) => {
                  const t = j.totals || {};
                  return (
                    <TableRow key={j.id} hover>
                      <TableCell>{new Date(j.created_at).toLocaleString()}</TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{j.type}</TableCell>
                      <TableCell align="right">{t.products_imported ?? 0}</TableCell>
                      <TableCell align="right">{t.products_updated ?? 0}</TableCell>
                      <TableCell align="right">{t.variants_imported ?? 0}</TableCell>
                      <TableCell align="right">{t.errors ?? 0}</TableCell>
                      <TableCell>
                        <Chip size="small" label={j.status} color={STATUS_COLOR[j.status] || 'default'} />
                      </TableCell>
                      <TableCell align="right">{formatDuration(j.duration_ms)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
