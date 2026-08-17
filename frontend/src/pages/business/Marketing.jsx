import { useState } from 'react';
import {
  Alert, Badge, Box, Button, NativeSelect, Textarea, Tabs,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Add, Send, Replay } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import FeatureGate from '../../components/FeatureGate';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import RHFTextField from '../../components/RHFTextField';
import { formatDisplayText } from '../../utils/displayText';

export default function MarketingPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('campaigns');
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [segmentOpen, setSegmentOpen] = useState(false);
  const [tierOpen, setTierOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [createdReferrals, setCreatedReferrals] = useState([]);
  const [error, setError] = useState('');
  const campaignForm = useForm({ defaultValues: { name: '', channel: 'email', subject: '', body: '' } });
  const segmentForm = useForm({ defaultValues: { name: '', type: 'all' } });
  const tierForm = useForm({ defaultValues: { name: '', min_points: 0, multiplier: 1 } });
  const referralForm = useForm({ defaultValues: { customer_id: '', code: '', reward_points: 100 } });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: () => api.get('/marketing/campaigns', { params: { limit: 50 } }).then((r) => r.data.data),
  });

  const { data: abandoned, isLoading: abandonedLoading } = useQuery({
    queryKey: ['marketing-abandoned'],
    queryFn: () => api.get('/marketing/carts/abandoned', { params: { limit: 50 } }).then((r) => r.data.data),
    enabled: tab === 'abandoned',
  });

  const { data: segments, isLoading: segmentsLoading } = useQuery({
    queryKey: ['marketing-segments'],
    queryFn: () => api.get('/marketing/segments', { params: { limit: 50 } }).then((r) => r.data.data),
    enabled: tab === 'segments',
  });

  const { data: tiers, isLoading: tiersLoading } = useQuery({
    queryKey: ['marketing-loyalty-tiers'],
    queryFn: () => api.get('/marketing/loyalty-tiers').then((r) => r.data.data),
    enabled: tab === 'tiers',
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-short'],
    queryFn: () => api.get('/customers', { params: { limit: 100 } }).then((r) => r.data.data),
    enabled: referralOpen,
  });

  const createCampaign = useMutation({
    mutationFn: (payload) => api.post('/marketing/campaigns', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['marketing-campaigns']);
      setCampaignOpen(false);
      campaignForm.reset();
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to create campaign'),
  });

  const sendCampaign = useMutation({
    mutationFn: (id) => api.post(`/marketing/campaigns/${id}/send`),
    onSuccess: () => queryClient.invalidateQueries(['marketing-campaigns']),
    onError: (err) => setError(err.response?.data?.message || 'Send failed'),
  });

  const recoverCart = useMutation({
    mutationFn: (id) => api.post(`/marketing/carts/${id}/recover`),
    onSuccess: () => queryClient.invalidateQueries(['marketing-abandoned']),
    onError: (err) => setError(err.response?.data?.message || 'Recovery failed'),
  });

  const createSegment = useMutation({
    mutationFn: (payload) => api.post('/marketing/segments', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['marketing-segments']);
      setSegmentOpen(false);
      segmentForm.reset();
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to create segment'),
  });

  const createTier = useMutation({
    mutationFn: (payload) => api.post('/marketing/loyalty-tiers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['marketing-loyalty-tiers']);
      setTierOpen(false);
      tierForm.reset();
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to create tier'),
  });

  const createReferral = useMutation({
    mutationFn: (payload) => api.post('/marketing/referrals', payload).then((r) => r.data.data),
    onSuccess: (data) => {
      if (data) setCreatedReferrals((prev) => [data, ...prev]);
      setReferralOpen(false);
      referralForm.reset();
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to create referral'),
  });

  return (
    <FeatureGate pack="marketing_pro">
      <Box>
        <PageHeader title="Marketing" subtitle="Campaigns, abandoned carts, segments, loyalty, and referrals" />
        {error ? (
          <Alert color="red" mb="md" withCloseButton onClose={() => setError('')}>
            {error}
          </Alert>
        ) : null}

        <Tabs value={tab} onChange={setTab} mb="md">
          <Tabs.List>
            <Tabs.Tab value="campaigns">Campaigns</Tabs.Tab>
            <Tabs.Tab value="abandoned">Abandoned Carts</Tabs.Tab>
            <Tabs.Tab value="segments">Segments</Tabs.Tab>
            <Tabs.Tab value="tiers">Loyalty Tiers</Tabs.Tab>
            <Tabs.Tab value="referrals">Referrals</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="campaigns" pt="md">
            <Button
              leftSection={<Add />}
              mb="md"
              onClick={() => {
                setError('');
                setCampaignOpen(true);
              }}
            >
              New campaign
            </Button>
            <DataTable
              columns={[
                { field: 'name', label: 'Name' },
                { field: 'channel', label: 'Channel', render: (r) => formatDisplayText(r.channel) },
                {
                  field: 'status',
                  label: 'Status',
                  render: (r) => <Badge size="sm">{formatDisplayText(r.status)}</Badge>,
                },
                {
                  field: 'scheduled_at',
                  label: 'Scheduled',
                  render: (r) => (r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : '—'),
                },
                {
                  field: 'actions',
                  label: '',
                  render: (r) => (
                    <Button
                      size="compact-sm"
                      leftSection={<Send fontSize="small" />}
                      disabled={r.status === 'sent' || sendCampaign.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        sendCampaign.mutate(r.id);
                      }}
                    >
                      Send
                    </Button>
                  ),
                },
              ]}
              rows={campaigns || []}
              loading={campaignsLoading}
              emptyTitle="No campaigns"
              emptyMessage="Create an email or SMS campaign to reach customers."
            />
          </Tabs.Panel>

          <Tabs.Panel value="abandoned" pt="md">
            <DataTable
              columns={[
                { field: 'email', label: 'Email', render: (r) => r.email || '—' },
                {
                  field: 'items',
                  label: 'Items',
                  render: (r) => (Array.isArray(r.items) ? r.items.length : '—'),
                },
                {
                  field: 'last_activity_at',
                  label: 'Last activity',
                  render: (r) =>
                    (r.last_activity_at ? new Date(r.last_activity_at).toLocaleString() : '—'),
                },
                { field: 'recovery_emails_sent', label: 'Emails sent' },
                {
                  field: 'actions',
                  label: '',
                  render: (r) => (
                    <Button
                      size="compact-sm"
                      leftSection={<Replay fontSize="small" />}
                      disabled={!!r.recovered_at || recoverCart.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        recoverCart.mutate(r.id);
                      }}
                    >
                      Recover
                    </Button>
                  ),
                },
              ]}
              rows={abandoned || []}
              loading={abandonedLoading}
              emptyTitle="No abandoned carts"
              emptyMessage="Abandoned storefront carts will appear here for recovery emails."
            />
          </Tabs.Panel>

          <Tabs.Panel value="segments" pt="md">
            <Button leftSection={<Add />} mb="md" onClick={() => setSegmentOpen(true)}>
              New segment
            </Button>
            <DataTable
              columns={[
                { field: 'name', label: 'Name' },
                {
                  field: 'type',
                  label: 'Type',
                  render: (r) => formatDisplayText(r.type || r.query_type || 'custom'),
                },
                {
                  field: 'created_at',
                  label: 'Created',
                  render: (r) => (r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'),
                },
              ]}
              rows={segments || []}
              loading={segmentsLoading}
              emptyTitle="No segments"
              emptyMessage="Create customer segments for targeting campaigns."
            />
          </Tabs.Panel>

          <Tabs.Panel value="tiers" pt="md">
            <Button leftSection={<Add />} mb="md" onClick={() => setTierOpen(true)}>
              Add tier
            </Button>
            <DataTable
              columns={[
                { field: 'name', label: 'Tier' },
                { field: 'min_points', label: 'Min points' },
                { field: 'multiplier', label: 'Multiplier' },
              ]}
              rows={tiers || []}
              loading={tiersLoading}
              emptyTitle="No loyalty tiers"
              emptyMessage="Define point thresholds and reward multipliers."
            />
          </Tabs.Panel>

          <Tabs.Panel value="referrals" pt="md">
            <Button leftSection={<Add />} mb="md" onClick={() => setReferralOpen(true)}>
              Create referral
            </Button>
            <DataTable
              columns={[
                { field: 'code', label: 'Code' },
                {
                  field: 'status',
                  label: 'Status',
                  render: (r) => (
                    <Badge size="sm">{formatDisplayText(r.status || 'active')}</Badge>
                  ),
                },
                { field: 'reward_points', label: 'Reward pts' },
                {
                  field: 'created_at',
                  label: 'Created',
                  render: (r) => (r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'),
                },
              ]}
              rows={createdReferrals}
              emptyTitle="No referrals this session"
              emptyMessage="Generate a referral code for a customer. Newly created codes appear here."
            />
          </Tabs.Panel>
        </Tabs>

        <FormDialog
          open={campaignOpen}
          title="New campaign"
          onClose={() => setCampaignOpen(false)}
          onSubmit={campaignForm.handleSubmit((v) => createCampaign.mutate(v))}
          loading={createCampaign.isPending}
          submitLabel="Create"
        >
          <RHFTextField register={campaignForm.register} name="name" rules={{ required: true }} label="Name" />
          <NativeSelect
            label="Channel"
            w="100%"
            {...campaignForm.register('channel')}
            data={[
              { value: 'email', label: 'Email' },
              { value: 'sms', label: 'SMS' },
            ]}
          />
          <RHFTextField register={campaignForm.register} name="subject" label="Subject" />
          <Textarea label="Body" minRows={4} w="100%" {...campaignForm.register('body')} />
        </FormDialog>

        <FormDialog
          open={segmentOpen}
          title="New segment"
          onClose={() => setSegmentOpen(false)}
          onSubmit={segmentForm.handleSubmit((v) =>
            createSegment.mutate({
              name: v.name,
              filter_type: v.type,
              filter_config: { type: v.type },
            }),
          )}
          loading={createSegment.isPending}
          submitLabel="Create"
        >
          <RHFTextField register={segmentForm.register} name="name" rules={{ required: true }} label="Name" />
          <NativeSelect
            label="Type"
            w="100%"
            {...segmentForm.register('type')}
            data={[
              { value: 'all', label: 'All customers' },
              { value: 'high_value', label: 'High value' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </FormDialog>

        <FormDialog
          open={tierOpen}
          title="Loyalty tier"
          onClose={() => setTierOpen(false)}
          onSubmit={tierForm.handleSubmit((v) =>
            createTier.mutate({
              name: v.name,
              min_points: parseInt(v.min_points, 10) || 0,
              multiplier: parseFloat(v.multiplier) || 1,
            }),
          )}
          loading={createTier.isPending}
          submitLabel="Create"
        >
          <RHFTextField register={tierForm.register} name="name" rules={{ required: true }} label="Name" />
          <RHFTextField register={tierForm.register} name="min_points" label="Min points" type="number" />
          <RHFTextField register={tierForm.register} name="multiplier" label="Multiplier" type="number" />
        </FormDialog>

        <FormDialog
          open={referralOpen}
          title="Create referral"
          onClose={() => setReferralOpen(false)}
          onSubmit={referralForm.handleSubmit((v) =>
            createReferral.mutate({
              customer_id: v.customer_id,
              code: v.code || undefined,
              reward_points: parseInt(v.reward_points, 10) || 0,
            }),
          )}
          loading={createReferral.isPending}
          submitLabel="Create"
        >
          <NativeSelect
            label="Customer"
            w="100%"
            {...referralForm.register('customer_id', { required: true })}
            data={[
              { value: '', label: 'Select customer' },
              ...(customers || []).map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
          <RHFTextField register={referralForm.register} name="code" label="Code (optional)" />
          <RHFTextField register={referralForm.register} name="reward_points" label="Reward points" type="number" />
        </FormDialog>
      </Box>
    </FeatureGate>
  );
}
