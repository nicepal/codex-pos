import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Chip, IconButton, TextField, MenuItem, Grid, Alert } from '@mui/material';
import { Visibility, Block, CheckCircle, Add } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import RHFTextField from '../../components/RHFTextField';
import { emptyPresetProps } from '../../utils/emptyStatePresets';
import { formatDisplayText } from '../../utils/displayText';

const statusColors = { active: 'success', trial: 'info', suspended: 'error', expired: 'warning' };
const empty = emptyPresetProps('businesses');

const timezones = ['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Asia/Karachi', 'Asia/Dubai'];
const currencies = ['USD', 'EUR', 'GBP', 'PKR', 'AED', 'SAR'];

export default function BusinessesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, reset, control } = useForm();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.get('/businesses').then((r) => r.data),
  });

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/businesses', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['businesses']);
      setOpen(false);
      setFormError('');
      reset();
      const id = res.data?.data?.id;
      if (id) navigate(`/admin/businesses/${id}`);
    },
    onError: (err) => {
      setFormError(err.response?.data?.message || 'Failed to create business');
    },
  });

  const handleAction = async (id, action) => {
    await api.post(`/businesses/${id}/${action}`);
    refetch();
  };

  const openForm = () => {
    setFormError('');
    reset({
      businessName: '',
      slug: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      plan_id: '',
      trial_days: 14,
      status: 'trial',
      currency: 'USD',
      timezone: 'UTC',
    });
    setOpen(true);
  };

  const columns = [
    { field: 'name', label: 'Business' },
    { field: 'owner', label: 'Owner', render: (r) => r.owner_name || r.owner_email },
    { field: 'plan_name', label: 'Plan', render: (r) => r.plan_name || '-' },
    { field: 'status', label: 'Status', render: (r) => <Chip label={formatDisplayText(r.status)} color={statusColors[r.status] || 'default'} size="small" /> },
    { field: 'subdomain', label: 'Subdomain', render: (r) => r.subdomain || `${r.slug}.eyz.com` },
    {
      field: 'actions', label: 'Actions',
      render: (r) => (
        <>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/admin/businesses/${r.id}`); }}><Visibility fontSize="small" /></IconButton>
          {r.status === 'suspended' ? (
            <IconButton size="small" color="success" onClick={(e) => { e.stopPropagation(); handleAction(r.id, 'activate'); }}><CheckCircle fontSize="small" /></IconButton>
          ) : (
            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleAction(r.id, 'suspend'); }}><Block fontSize="small" /></IconButton>
          )}
        </>
      ),
    },
  ];

  const onSubmit = (form) => {
    createMutation.mutate({
      businessName: form.businessName,
      slug: form.slug?.trim() || undefined,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone || undefined,
      password: form.password,
      plan_id: form.plan_id || undefined,
      trial_days: parseInt(form.trial_days, 10) || 14,
      status: form.status,
      currency: (form.currency || 'USD').toUpperCase(),
      timezone: form.timezone,
    });
  };

  return (
    <>
      <PageHeader
        title="Business Management"
        subtitle="Platform tenants and subscriptions"
        actionLabel="Add Business"
        actionIcon={<Add />}
        onAction={openForm}
      />
      <DataTable
        columns={columns}
        rows={data?.data || []}
        loading={isLoading}
        onRowClick={(r) => navigate(`/admin/businesses/${r.id}`)}
        onEmptyAction={openForm}
        emptyActionIcon={<Add />}
        {...empty}
      />

      <FormDialog
        open={open}
        title="Add Business"
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit(onSubmit)}
        loading={createMutation.isPending}
        submitLabel="Create Business"
        maxWidth="md"
      >
        {formError && (
          <Grid item xs={12}>
            <Alert severity="error">{formError}</Alert>
          </Grid>
        )}
        <Grid item xs={12} sm={8}>
          <RHFTextField register={register} name="businessName" rules={{ required: true }} label="Business Name" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Slug"
            {...register('slug')}
            helperText="Optional · used for subdomain"
            placeholder="my-store"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField register={register} name="firstName" rules={{ required: true }} label="Owner First Name" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField register={register} name="lastName" rules={{ required: true }} label="Owner Last Name" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField register={register} name="email" rules={{ required: true }} label="Owner Email" type="email" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Phone" {...register('phone')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RHFTextField
            register={register}
            name="password"
            rules={{ required: true, minLength: 8 }}
            label="Password"
            type="password"
            helperText="Minimum 8 characters — owner login password"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth select label="Plan" defaultValue="" {...register('plan_id')}>
            <MenuItem value="">Starter (default)</MenuItem>
            {(plans || []).map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth select label="Initial Status" defaultValue="trial" {...register('status')}>
            <MenuItem value="trial">Trial</MenuItem>
            <MenuItem value="active">Active</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="Trial Days" type="number" defaultValue={14} {...register('trial_days')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Controller
            name="currency"
            control={control}
            defaultValue="USD"
            render={({ field }) => (
              <TextField fullWidth select label="Currency" {...field}>
                {currencies.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth select label="Timezone" defaultValue="UTC" {...register('timezone')}>
            {timezones.map((tz) => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
          </TextField>
        </Grid>
      </FormDialog>
    </>
  );
}
