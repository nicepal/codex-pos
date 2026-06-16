import { useState } from 'react';
import { Box, Grid, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import useBusinessCurrency from '../../../hooks/useBusinessCurrency';
import useDashboardOverview from './hooks/useDashboardOverview';
import DashboardHeader from './components/DashboardHeader';
import DashboardSkeleton from './components/DashboardSkeleton';
import KpiGrid from './components/KpiGrid';
import QuickActionsBar from './components/QuickActionsBar';
import AlertsPanel from './components/AlertsPanel';
import SalesAnalyticsSection from './components/SalesAnalyticsSection';
import TopProductsWidget from './components/TopProductsWidget';
import InventoryHealthPanel from './components/InventoryHealthPanel';
import RecentOrdersTable from './components/RecentOrdersTable';
import FinancialSummaryCard from './components/FinancialSummaryCard';
import CustomerInsightsPanel from './components/CustomerInsightsPanel';
import ActivityTimeline from './components/ActivityTimeline';
import NotificationsPanel from './components/NotificationsPanel';

export default function BusinessDashboardPage() {
  const [range, setRange] = useState('30d');
  const navigate = useNavigate();
  const { formatMoney } = useBusinessCurrency();
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboardOverview(range);

  if (isLoading && !data) {
    return <DashboardSkeleton />;
  }

  const errorMessage = isError
    ? (error?.response?.data?.message || error?.message || 'Failed to load dashboard')
    : null;

  return (
    <Box sx={{ pb: 3 }}>
      <DashboardHeader
        range={range}
        onRangeChange={setRange}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        generatedAt={data?.generatedAt}
      />

      {errorMessage && !data && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Box component="button" onClick={() => refetch()}>Retry</Box>}>
          {errorMessage}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <KpiGrid kpis={data?.kpis} formatMoney={formatMoney} onNavigate={navigate} />
      </Box>

      <QuickActionsBar />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} lg={4}>
          <AlertsPanel
            alerts={data?.alerts}
            loading={isLoading}
            error={errorMessage && data ? errorMessage : null}
            onRetry={refetch}
          />
        </Grid>
        <Grid item xs={12} lg={8}>
          <SalesAnalyticsSection
            charts={data?.charts}
            formatMoney={formatMoney}
            loading={isLoading}
            error={errorMessage && data ? errorMessage : null}
            onRetry={refetch}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TopProductsWidget
            products={data?.topProducts}
            formatMoney={formatMoney}
            loading={isLoading}
            error={errorMessage && data ? errorMessage : null}
            onRetry={refetch}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <InventoryHealthPanel
            inventory={data?.inventory}
            formatMoney={formatMoney}
            loading={isLoading}
            error={errorMessage && data ? errorMessage : null}
            onRetry={refetch}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} lg={8}>
          <RecentOrdersTable
            orders={data?.recentOrders}
            formatMoney={formatMoney}
            loading={isLoading}
            error={errorMessage && data ? errorMessage : null}
            onRetry={refetch}
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <FinancialSummaryCard
            financial={data?.financial}
            formatMoney={formatMoney}
            loading={isLoading}
            error={errorMessage && data ? errorMessage : null}
            onRetry={refetch}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <CustomerInsightsPanel
            customers={data?.customers}
            formatMoney={formatMoney}
            loading={isLoading}
            error={errorMessage && data ? errorMessage : null}
            onRetry={refetch}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ActivityTimeline
            activity={data?.activity}
            loading={isLoading}
            error={errorMessage && data ? errorMessage : null}
            onRetry={refetch}
          />
        </Grid>
      </Grid>

      <NotificationsPanel
        notifications={data?.notifications}
        loading={isLoading}
        error={errorMessage && data ? errorMessage : null}
        onRetry={refetch}
      />
    </Box>
  );
}
