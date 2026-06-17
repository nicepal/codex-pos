import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, MenuItem, Card, CardContent, Stack, Alert,
} from '@mui/material';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import FeatureGate from '../../components/FeatureGate';
import useBusinessCurrency from '../../hooks/useBusinessCurrency';

export default function DrawerPage() {
  const queryClient = useQueryClient();
  const { formatMoney } = useBusinessCurrency();
  const [openFloat, setOpenFloat] = useState('0');
  const [closeCash, setCloseCash] = useState('');
  const [branchId, setBranchId] = useState('');
  const [openError, setOpenError] = useState('');

  const { data: openSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['drawer-open'],
    queryFn: () => api.get('/drawer/open').then((r) => r.data.data),
  });

  const session = openSessions?.[0];

  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches', { params: { limit: 50 } }).then((r) => r.data.data),
  });

  useEffect(() => {
    if (!branches?.length || branchId) return;
    const primary = branches.find((b) => b.is_primary) || branches[0];
    if (primary) setBranchId(primary.id);
  }, [branches, branchId]);

  const openMutation = useMutation({
    mutationFn: (payload) => api.post('/drawer/open', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['drawer-open']);
      setOpenFloat('0');
      setOpenError('');
    },
    onError: (err) => {
      setOpenError(err.response?.data?.message || 'Failed to open drawer session');
    },
  });

  const closeMutation = useMutation({
    mutationFn: (payload) => api.post(`/drawer/${session.id}/close`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['drawer-open']);
      setCloseCash('');
    },
  });

  const handleOpen = () => {
    setOpenError('');
    openMutation.mutate({
      branch_id: branchId || null,
      opening_float: parseFloat(openFloat) || 0,
    });
  };

  return (
    <FeatureGate pack="staff_pro">
      <Box>
        <PageHeader title="Cash Drawer" subtitle="Open and close drawer sessions for your shift" />

        {sessionsLoading ? (
          <Typography color="text.secondary">Loading session…</Typography>
        ) : session ? (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Session open</Typography>
              {session.branch_name && (
                <Typography color="text.secondary" gutterBottom>Branch: {session.branch_name}</Typography>
              )}
              <Typography>Opening float: {formatMoney(session.opening_float)}</Typography>
              <Typography>Opened: {new Date(session.opened_at).toLocaleString()}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }} alignItems="flex-start">
                <TextField
                  label="Counted cash"
                  type="number"
                  value={closeCash}
                  onChange={(e) => setCloseCash(e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                />
                <Button
                  variant="contained"
                  color="warning"
                  disabled={closeMutation.isPending}
                  onClick={() => closeMutation.mutate({ closing_cash: parseFloat(closeCash) || 0 })}
                >
                  Close drawer
                </Button>
              </Stack>
              {closeMutation.isError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {closeMutation.error?.response?.data?.message || 'Failed to close drawer'}
                </Alert>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Open drawer</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Start a cash drawer session before ringing up sales. Count the cash in the drawer and enter the opening float.
              </Typography>

              {!branchesLoading && !branches?.length && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No branches configured yet — you can still open a drawer for your main location, or{' '}
                  <Button component={RouterLink} to="/branches" size="small">add a branch</Button> first.
                </Alert>
              )}

              {openError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setOpenError('')}>{openError}</Alert>}

              <Stack spacing={2} sx={{ maxWidth: 400 }}>
                {branches?.length > 0 && (
                  <TextField
                    select
                    label="Branch"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    helperText="Select the location for this drawer session"
                  >
                    {branches.map((b) => (
                      <MenuItem key={b.id} value={b.id}>{b.name}{b.is_primary ? ' (Primary)' : ''}</MenuItem>
                    ))}
                  </TextField>
                )}
                <TextField
                  label="Opening float"
                  type="number"
                  value={openFloat}
                  onChange={(e) => setOpenFloat(e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Cash already in the drawer at shift start"
                />
                <Button
                  variant="contained"
                  disabled={openMutation.isPending}
                  onClick={handleOpen}
                >
                  {openMutation.isPending ? 'Opening…' : 'Open session'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Box>
    </FeatureGate>
  );
}
