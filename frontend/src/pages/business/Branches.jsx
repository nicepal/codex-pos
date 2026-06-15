import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, TextField, Grid } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';

export default function BranchesPage() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/branches', payload),
    onSuccess: () => { queryClient.invalidateQueries(['branches']); setOpen(false); reset(); },
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Branches</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>Add Branch</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Code</TableCell><TableCell>Phone</TableCell><TableCell>Primary</TableCell></TableRow></TableHead>
          <TableBody>
            {(data?.data || []).map((b) => (
              <TableRow key={b.id}>
                <TableCell>{b.name}</TableCell>
                <TableCell>{b.code || '-'}</TableCell>
                <TableCell>{b.phone || '-'}</TableCell>
                <TableCell>{b.is_primary ? 'Yes' : 'No'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Branch</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}><TextField fullWidth label="Name" {...register('name', { required: true })} /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Code" {...register('code')} /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Phone" {...register('phone')} /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Address" {...register('address')} /></Grid>
              <Grid item xs={12}><Button type="submit" variant="contained" fullWidth>Create</Button></Grid>
            </Grid>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
