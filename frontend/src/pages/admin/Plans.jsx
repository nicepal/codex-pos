import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Grid, Card, CardContent, Button, IconButton, TextField, MenuItem } from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadingState from '../../components/LoadingState';

export default function PlansPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then((r) => r.data.data),
  });

  const openForm = (plan = null) => {
    setEditing(plan);
    reset(plan || { name: '', slug: '', monthly_price: 29, annual_price: 290, trial_days: 14, product_limit: 100, user_limit: 2, branch_limit: 1, status: 'active' });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing ? api.put(`/plans/${editing.id}`, payload) : api.post('/plans', payload)),
    onSuccess: () => { queryClient.invalidateQueries(['plans']); setOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/plans/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['plans']); setDeleteId(null); },
  });

  if (isLoading) return <LoadingState />;

  return (
    <Box>
      <PageHeader title="Subscription Plans" actionLabel="Add Plan" actionIcon={<Add />} onAction={() => openForm()} />
      <Grid container spacing={3}>
        {(data || []).map((plan) => (
          <Grid item xs={12} md={4} key={plan.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" fontWeight={700}>{plan.name}</Typography>
                  <Box>
                    <IconButton size="small" onClick={() => openForm(plan)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteId(plan.id)}><Delete fontSize="small" /></IconButton>
                  </Box>
                </Box>
                <Typography variant="h4" color="primary" sx={{ my: 2 }}>${plan.monthly_price}<Typography component="span" variant="body2">/mo</Typography></Typography>
                <Typography variant="body2" color="text.secondary">Products: {plan.product_limit === -1 ? 'Unlimited' : plan.product_limit}</Typography>
                <Typography variant="body2" color="text.secondary">Users: {plan.user_limit === -1 ? 'Unlimited' : plan.user_limit}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <FormDialog open={open} title={editing ? 'Edit Plan' : 'Add Plan'} onClose={() => setOpen(false)} onSubmit={handleSubmit((d) => saveMutation.mutate({ ...d, monthly_price: parseFloat(d.monthly_price), annual_price: parseFloat(d.annual_price), product_limit: parseInt(d.product_limit, 10), user_limit: parseInt(d.user_limit, 10), branch_limit: parseInt(d.branch_limit, 10), trial_days: parseInt(d.trial_days, 10) }))} loading={saveMutation.isPending}>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Name" {...register('name', { required: true })} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Slug" {...register('slug', { required: true })} /></Grid>
        <Grid item xs={6}><TextField fullWidth label="Monthly Price" type="number" {...register('monthly_price')} /></Grid>
        <Grid item xs={6}><TextField fullWidth label="Annual Price" type="number" {...register('annual_price')} /></Grid>
        <Grid item xs={4}><TextField fullWidth label="Product Limit" type="number" {...register('product_limit')} helperText="-1 = unlimited" /></Grid>
        <Grid item xs={4}><TextField fullWidth label="User Limit" type="number" {...register('user_limit')} /></Grid>
        <Grid item xs={4}><TextField fullWidth label="Branch Limit" type="number" {...register('branch_limit')} /></Grid>
      </FormDialog>
      <ConfirmDialog open={!!deleteId} title="Delete Plan" message="Delete this plan?" onConfirm={() => deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} danger confirmLabel="Delete" />
    </Box>
  );
}
