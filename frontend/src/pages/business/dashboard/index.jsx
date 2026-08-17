import { useState } from 'react';
import { Alert, Box, Button, SimpleGrid } from '@mantine/core';
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
    ? error?.response?.data?.message || error?.message || 'Failed to load dashboard'
    : null;

  return (
    <Box pb="lg">
      <DashboardHeader
        range={range}
        onRangeChange={setRange}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        generatedAt={data?.generatedAt}
      />

      {errorMessage && !data ? (
        <Alert
          color="red"
          mb="md"
          title="Dashboard error"
        >
          {errorMessage}{' '}
          <Button size="compact-sm" variant="subtle" color="red" onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      ) : null}

      <Box mb="md">
        <KpiGrid kpis={data?.kpis} formatMoney={formatMoney} onNavigate={navigate} />
      </Box>

      <QuickActionsBar />

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md" mb="md">
        <Box style={{ gridColumn: 'span 1' }}>
          <AlertsPanel
            alerts={data?.alerts}
            loading={isLoading}
            error={errorMessage && data ? errorMessage : null}
            onRetry={refetch}
          />
        </Box>
        <Box style={{ gridColumn: 'span 2' }}>
          <SalesAnalyticsSection
            charts={data?.charts}
            formatMoney={formatMoney}
            loading={isLoading}
            error={errorMessage && data ? errorMessage : null}
            onRetry={refetch}
          />
        </Box>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md">
        <TopProductsWidget
          products={data?.topProducts}
          formatMoney={formatMoney}
          loading={isLoading}
          error={errorMessage && data ? errorMessage : null}
          onRetry={refetch}
        />
        <InventoryHealthPanel
          inventory={data?.inventory}
          formatMoney={formatMoney}
          loading={isLoading}
          error={errorMessage && data ? errorMessage : null}
          onRetry={refetch}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md" mb="md">
        <Box style={{ gridColumn: 'span 2' }}>
          <RecentOrdersTable
            orders={data?.recentOrders}
            formatMoney={formatMoney}
            loading={isLoading}
            error={errorMessage && data ? errorMessage : null}
            onRetry={refetch}
          />
        </Box>
        <FinancialSummaryCard
          financial={data?.financial}
          formatMoney={formatMoney}
          loading={isLoading}
          error={errorMessage && data ? errorMessage : null}
          onRetry={refetch}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md">
        <CustomerInsightsPanel
          customers={data?.customers}
          formatMoney={formatMoney}
          loading={isLoading}
          error={errorMessage && data ? errorMessage : null}
          onRetry={refetch}
        />
        <ActivityTimeline
          activity={data?.activity}
          loading={isLoading}
          error={errorMessage && data ? errorMessage : null}
          onRetry={refetch}
        />
      </SimpleGrid>

      <NotificationsPanel
        notifications={data?.notifications}
        loading={isLoading}
        error={errorMessage && data ? errorMessage : null}
        onRetry={refetch}
      />
    </Box>
  );
}
