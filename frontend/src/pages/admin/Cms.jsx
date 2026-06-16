import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, Tab, Box, Grid, TextField } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import RHFTextField from '../../components/RHFTextField';

const TABS = [
  { key: 'pages', label: 'Pages', endpoint: '/cms/pages' },
  { key: 'blogs', label: 'Blogs', endpoint: '/cms/blogs' },
  { key: 'email-templates', label: 'Email Templates', endpoint: '/cms/email-templates' },
];

export default function CmsPage() {
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();
  const current = TABS[tab];

  const { data, isLoading } = useQuery({
    queryKey: ['cms', current.key],
    queryFn: () => api.get(current.endpoint).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post(current.endpoint, payload),
    onSuccess: () => { queryClient.invalidateQueries(['cms', current.key]); setOpen(false); reset(); },
  });

  const columns = [
    { field: 'title', label: 'Title', render: (r) => r.title || r.name },
    { field: 'slug', label: 'Slug' },
    { field: 'status', label: 'Status' },
    { field: 'created_at', label: 'Created', render: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  return (
    <Box>
      <PageHeader title="CMS" subtitle="Manage pages, blogs, and email templates" actionLabel="Add" actionIcon={<Add />} onAction={() => setOpen(true)} />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        {TABS.map((t) => <Tab key={t.key} label={t.label} />)}
      </Tabs>
      <DataTable columns={columns} rows={data?.data || []} loading={isLoading} emptyTitle={`No ${current.label.toLowerCase()}`} />
      <FormDialog open={open} title={`Add ${current.label.slice(0, -1)}`} onClose={() => setOpen(false)} onSubmit={handleSubmit((d) => createMutation.mutate(d))} loading={createMutation.isPending} maxWidth="md">
        <Grid item xs={12}><RHFTextField register={register} name={current.key === 'email-templates' ? 'name' : 'title'} rules={{ required: true }} label="Title / Name" /></Grid>
        {current.key !== 'email-templates' && <Grid item xs={12}><TextField fullWidth label="Slug" {...register('slug')} /></Grid>}
        {current.key === 'email-templates' && (
          <>
            <Grid item xs={12}><TextField fullWidth label="Subject" {...register('subject')} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Body HTML" multiline rows={4} {...register('body_html')} /></Grid>
          </>
        )}
        {(current.key === 'pages' || current.key === 'blogs') && (
          <Grid item xs={12}><TextField fullWidth label="Content" multiline rows={6} {...register('content')} /></Grid>
        )}
      </FormDialog>
    </Box>
  );
}
