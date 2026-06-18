import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Grid, Button, Stack } from '@mui/material';
import { Sync } from '@mui/icons-material';
import api from '../../../services/api';
import PageHeader from '../../../components/PageHeader';
import useRealtime from '../../../hooks/useRealtime';
import ConnectionCard from './shopify/ConnectionCard';
import ImportWizard from './shopify/ImportWizard';
import ImportProgress from './shopify/ImportProgress';
import ImportHistoryTable from './shopify/ImportHistoryTable';

const ACTIVE_STATUSES = ['queued', 'running'];

function errMsg(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

export default function ShopifyIntegrationPage() {
  const queryClient = useQueryClient();
  const [liveJob, setLiveJob] = useState(null);

  const statusQuery = useQuery({
    queryKey: ['shopify-status'],
    queryFn: () => api.get('/integrations/shopify/status').then((r) => r.data.data),
  });

  const status = statusQuery.data || { connected: false };
  const activeJobFromStatus = status.active_job;
  const hasActiveJob = activeJobFromStatus && ACTIVE_STATUSES.includes(activeJobFromStatus.status);

  const jobsQuery = useQuery({
    queryKey: ['shopify-jobs'],
    queryFn: () => api.get('/integrations/shopify/jobs').then((r) => r.data.data),
    enabled: status.connected,
  });

  // Poll status while a job is active (fallback when realtime is unavailable)
  useEffect(() => {
    if (!hasActiveJob) return undefined;
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['shopify-status'] });
    }, 2500);
    return () => clearInterval(id);
  }, [hasActiveJob, queryClient]);

  // Realtime progress updates
  const onProgress = useCallback((payload) => {
    setLiveJob((prev) => ({ ...(prev || {}), ...payload }));
    if (payload.status === 'completed' || payload.status === 'failed') {
      queryClient.invalidateQueries({ queryKey: ['shopify-status'] });
      queryClient.invalidateQueries({ queryKey: ['shopify-jobs'] });
    }
  }, [queryClient]);
  useRealtime('shopify.import.progress', onProgress);

  const onCompleted = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['shopify-status'] });
    queryClient.invalidateQueries({ queryKey: ['shopify-jobs'] });
  }, [queryClient]);
  useRealtime('shopify.import.completed', onCompleted);

  const connectMutation = useMutation({
    mutationFn: (body) => api.post('/integrations/shopify/connect', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopify-status'] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.delete('/integrations/shopify/disconnect'),
    onSuccess: () => {
      setLiveJob(null);
      queryClient.invalidateQueries({ queryKey: ['shopify-status'] });
      queryClient.invalidateQueries({ queryKey: ['shopify-jobs'] });
    },
  });

  const importMutation = useMutation({
    mutationFn: (body) => api.post('/integrations/shopify/import', body),
    onSuccess: () => {
      setLiveJob(null);
      queryClient.invalidateQueries({ queryKey: ['shopify-status'] });
      queryClient.invalidateQueries({ queryKey: ['shopify-jobs'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post('/integrations/shopify/sync'),
    onSuccess: () => {
      setLiveJob(null);
      queryClient.invalidateQueries({ queryKey: ['shopify-status'] });
      queryClient.invalidateQueries({ queryKey: ['shopify-jobs'] });
    },
  });

  // The progress card uses the freshest of realtime payload or server status
  const progressJob = hasActiveJob
    ? { ...activeJobFromStatus, ...(liveJob && liveJob.jobId === activeJobFromStatus.id ? liveJob : {}) }
    : (liveJob && ACTIVE_STATUSES.includes(liveJob.status) ? liveJob : null);

  const lastJob = status.last_job;

  return (
    <Box>
      <PageHeader
        title="Shopify"
        subtitle="Import and sync your Shopify catalog — products, variants, images, inventory and collections"
        action={status.connected ? (
          <Button
            variant="outlined"
            startIcon={<Sync />}
            disabled={syncMutation.isPending || hasActiveJob}
            onClick={() => syncMutation.mutate()}
          >
            Sync now
          </Button>
        ) : null}
      />

      <Grid container spacing={2}>
        <Grid item xs={12} md={status.connected ? 5 : 7}>
          <ConnectionCard
            status={status}
            onConnect={(body) => connectMutation.mutate(body)}
            onDisconnect={() => disconnectMutation.mutate()}
            connecting={connectMutation.isPending}
            disconnecting={disconnectMutation.isPending}
            connectError={connectMutation.isError ? errMsg(connectMutation.error, 'Failed to connect') : null}
          />
        </Grid>

        {status.connected && (
          <Grid item xs={12} md={7}>
            <Stack spacing={2}>
              <ImportWizard
                onStart={(body) => importMutation.mutateAsync(body)}
                starting={importMutation.isPending}
                startError={importMutation.isError ? errMsg(importMutation.error, 'Failed to start import') : null}
                activeJob={progressJob}
                lastJob={lastJob}
              />
              {progressJob && <ImportProgress job={progressJob} />}
            </Stack>
          </Grid>
        )}

        {status.connected && (
          <Grid item xs={12}>
            <ImportHistoryTable jobs={jobsQuery.data || []} />
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
