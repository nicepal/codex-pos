import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Chip,
  TextField, MenuItem, TablePagination, CircularProgress, Tooltip, Typography,
} from '@mui/material';
import api from '../../../services/api';
import PageHeader from '../../../components/PageHeader';

const STATUS_COLOR = { sent: 'success', failed: 'error', queued: 'warning' };

export default function EmailLogsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-email-logs', status, page, limit],
    queryFn: () => api.get('/admin/email/logs', {
      params: { status: status || undefined, page: page + 1, limit },
    }).then((r) => r.data),
    keepPreviousData: true,
  });

  const rows = data?.data || [];
  const total = data?.pagination?.total || 0;

  return (
    <Box>
      <PageHeader title="Email Logs" subtitle="Delivery history for all platform emails" />

      <Card>
        <CardContent>
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            sx={{ minWidth: 180, mb: 2 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="sent">Sent</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="queued">Queued</MenuItem>
          </TextField>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Recipient</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Template</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Attempts</TableCell>
                    <TableCell>Error</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                      <TableCell>{r.to_email}</TableCell>
                      <TableCell>{r.subject || '—'}</TableCell>
                      <TableCell>{r.template_slug || r.type || '—'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={r.status} color={STATUS_COLOR[r.status] || 'default'} />
                      </TableCell>
                      <TableCell>{r.attempts}</TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        {r.error_message ? (
                          <Tooltip title={r.error_message}>
                            <Typography variant="body2" color="error" noWrap>{r.error_message}</Typography>
                          </Tooltip>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={7}><Typography color="text.secondary" sx={{ py: 2 }}>No email logs yet.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={limit}
                onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
