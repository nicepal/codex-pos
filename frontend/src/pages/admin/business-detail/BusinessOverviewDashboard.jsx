import {
  Box, Typography, Card, CardContent, Grid, Stack, Chip, Avatar, LinearProgress,
  Button, TextField, MenuItem, Skeleton, Alert, Paper, Table, TableBody, TableCell,
  TableHead, TableRow, TableContainer, alpha, useTheme,
} from '@mui/material';
import {
  Inventory, Category, People, LocalShipping, Groups, ShoppingCart, AttachMoney,
  TrendingUp, Receipt, Warehouse, CheckCircle, Cancel, HourglassEmpty, Replay,
  Store, Login, PauseCircleOutline, Schedule, Upgrade, OpenInNew, DescriptionOutlined,
  Language, Email, Phone, Public, AccessTime, Payments, WorkspacePremium,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import StatCard from '../../../components/StatCard';
import DataTable from '../../../components/DataTable';
import {
  makeMoneyFormatter, formatGrowth, formatDate, formatDateTime, statusChipColor, formatStatus, usageLabel,
} from './dashboardHelpers';

const STATUS_STYLES = {
  active: 'success',
  trial: 'info',
  suspended: 'error',
  expired: 'warning',
};

const ORDER_CHART_COLORS = ['#f59e0b', '#22c55e', '#94a3b8', '#ef4444', '#6366f1', '#0ea5e9'];

function Section({ title, subtitle, children, action }) {
  return (
    <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>{title}</Typography>
            {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
          </Box>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function SalesPeriodCard({ label, period, formatMoney }) {
  const growth = formatGrowth(period?.growthPercent);
  const positive = (period?.growthPercent ?? 0) >= 0;

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
          {formatMoney(period?.amount)}
        </Typography>
        {growth && (
          <Typography variant="caption" color={positive ? 'success.main' : 'error.main'} fontWeight={600}>
            {growth} {period?.growthLabel}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function UsageBar({ label, used, limit, percent }) {
  const display = usageLabel(used, limit);
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" fontWeight={600}>{display}</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percent ?? (limit ? Math.min(100, (used / limit) * 100) : 0)}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
}

export default function BusinessOverviewDashboard({
  dashboard,
  plans,
  selectedPlan,
  onPlanChange,
  onSuspend,
  onActivate,
  onExtendTrial,
  onUpgradePlan,
  onImpersonate,
  onViewAuditLogs,
  actionPending,
  impersonatePending,
  businessStatus,
}) {
  const theme = useTheme();
  const { business, kpis, salesAnalytics, orderAnalytics, inventoryAnalytics,
    customerAnalytics, productAnalytics, financialAnalytics, subscriptionAnalytics,
    usageAnalytics, recentOrders, recentPurchaseOrders, activities, systemHealth } = dashboard;

  const formatMoney = makeMoneyFormatter(business.currency);
  const storefrontUrl = `/store/${business.slug}`;

  const orderChartData = (orderAnalytics?.chart || []).map((d) => ({
    name: formatStatus(d.status),
    count: d.count,
  }));

  const topProductColumns = [
    { field: 'productName', label: 'Product' },
    { field: 'quantitySold', label: 'Qty Sold' },
    { field: 'revenue', label: 'Revenue', render: (r) => formatMoney(r.revenue) },
  ];

  const recentOrderColumns = [
    { field: 'orderNumber', label: 'Invoice' },
    { field: 'customerName', label: 'Customer' },
    { field: 'amount', label: 'Amount', render: (r) => formatMoney(r.amount) },
    { field: 'status', label: 'Status', render: (r) => <Chip label={formatStatus(r.status)} size="small" color={statusChipColor(r.status)} /> },
    { field: 'createdAt', label: 'Date', render: (r) => formatDate(r.createdAt) },
  ];

  const poColumns = [
    { field: 'poNumber', label: 'PO Number' },
    { field: 'supplierName', label: 'Supplier' },
    { field: 'amount', label: 'Amount', render: (r) => formatMoney(r.amount) },
    { field: 'status', label: 'Status', render: (r) => <Chip label={formatStatus(r.status)} size="small" /> },
    { field: 'createdAt', label: 'Date', render: (r) => formatDate(r.createdAt) },
  ];

  const topCustomerColumns = [
    { field: 'name', label: 'Customer' },
    { field: 'orderCount', label: 'Orders' },
    { field: 'totalSpent', label: 'Spent', render: (r) => formatMoney(r.totalSpent) },
  ];

  return (
    <Box>
      {/* Profile header */}
      <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }}>
            <Avatar
              src={business.logoUrl || undefined}
              sx={{ width: 80, height: 80, bgcolor: alpha(theme.palette.primary.main, 0.12) }}
            >
              <Store sx={{ fontSize: 40 }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                <Typography variant="h4" fontWeight={800}>{business.name}</Typography>
                <Chip label={formatStatus(business.status)} color={STATUS_STYLES[business.status] || 'default'} size="small" />
              </Stack>
              <Typography color="text.secondary" gutterBottom>
                Owner: {business.ownerName || '—'} · {business.ownerEmail}
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 1 }}>
                <Chip icon={<WorkspacePremium />} label={business.planName || subscriptionAnalytics?.planName || 'No plan'} size="small" variant="outlined" />
                <Chip icon={<Payments />} label={formatStatus(subscriptionAnalytics?.paymentStatus)} size="small" variant="outlined" />
              </Stack>
            </Box>
            <Stack spacing={1} sx={{ minWidth: 200 }}>
              <Typography variant="caption" color="text.secondary">Registered</Typography>
              <Typography fontWeight={600}>{formatDate(business.registeredAt)}</Typography>
              <Typography variant="caption" color="text.secondary">Last login</Typography>
              <Typography fontWeight={600}>{formatDateTime(business.lastLoginAt)}</Typography>
            </Stack>
          </Stack>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            {[
              { icon: <Email fontSize="small" />, label: 'Email', value: business.email },
              { icon: <Phone fontSize="small" />, label: 'Phone', value: business.phone },
              { icon: <Public fontSize="small" />, label: 'Country', value: business.country },
              { icon: <AccessTime fontSize="small" />, label: 'Timezone', value: business.timezone },
              { icon: <AttachMoney fontSize="small" />, label: 'Currency', value: business.currency },
              { icon: <Language fontSize="small" />, label: 'Domain', value: business.primaryDomain },
            ].map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item.label}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ color: 'text.secondary' }}>{item.icon}</Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{item.value || '—'}</Typography>
                  </Box>
                </Stack>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Address</Typography>
              <Typography variant="body2" fontWeight={600}>{business.address || '—'}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Section title="Quick Actions" subtitle="Manage tenant account and access">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Button variant="contained" startIcon={<Login />} onClick={onImpersonate} disabled={impersonatePending}>
            Login As Business
          </Button>
          {businessStatus === 'suspended' ? (
            <Button variant="outlined" color="success" startIcon={<PauseCircleOutline />} onClick={onActivate} disabled={actionPending}>
              Activate Business
            </Button>
          ) : (
            <Button variant="outlined" color="error" startIcon={<PauseCircleOutline />} onClick={onSuspend} disabled={actionPending}>
              Suspend Business
            </Button>
          )}
          <Button variant="outlined" startIcon={<Schedule />} onClick={onExtendTrial} disabled={actionPending}>
            Extend Trial
          </Button>
          <Button variant="outlined" startIcon={<OpenInNew />} href={storefrontUrl} target="_blank" rel="noopener noreferrer">
            View Storefront
          </Button>
          <Button variant="outlined" startIcon={<DescriptionOutlined />} onClick={onViewAuditLogs}>
            View Audit Logs
          </Button>
        </Stack>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField select fullWidth size="small" label="Change plan" value={selectedPlan} onChange={(e) => onPlanChange(e.target.value)} displayEmpty>
              <MenuItem value="" disabled>Select a plan</MenuItem>
              {(plans || []).map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name} — ${Number(p.monthly_price).toFixed(0)}/mo</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button fullWidth variant="outlined" startIcon={<Upgrade />} disabled={!selectedPlan || actionPending} onClick={onUpgradePlan}>
              Apply Plan Change
            </Button>
          </Grid>
        </Grid>
      </Section>

      {/* KPIs */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Business KPIs</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Products', value: kpis.totalProducts, icon: <Inventory color="primary" /> },
          { title: 'Categories', value: kpis.totalCategories, icon: <Category color="secondary" /> },
          { title: 'Customers', value: kpis.totalCustomers, icon: <People color="info" /> },
          { title: 'Suppliers', value: kpis.totalSuppliers, icon: <LocalShipping color="action" /> },
          { title: 'Employees', value: kpis.totalEmployees, icon: <Groups color="action" /> },
          { title: 'Orders', value: kpis.totalOrders, icon: <ShoppingCart color="warning" /> },
          { title: 'Total Sales', value: formatMoney(kpis.totalSales), icon: <AttachMoney color="success" /> },
          { title: 'Total Profit', value: formatMoney(kpis.totalProfit), icon: <TrendingUp color="success" /> },
          { title: 'Total Expenses', value: formatMoney(kpis.totalExpenses), icon: <Receipt color="error" /> },
          { title: 'Inventory Value', value: formatMoney(kpis.inventoryValue), icon: <Warehouse color="primary" /> },
        ].map((k) => (
          <Grid item xs={6} sm={4} md={3} lg={2} key={k.title}>
            <StatCard title={k.title} value={k.value} icon={k.icon} />
          </Grid>
        ))}
      </Grid>

      {/* Sales analytics */}
      <Section title="Sales Analytics" subtitle="Revenue performance with period-over-period growth">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}><SalesPeriodCard label="Today" period={salesAnalytics.today} formatMoney={formatMoney} /></Grid>
          <Grid item xs={12} sm={6} md={3}><SalesPeriodCard label="This Week" period={salesAnalytics.thisWeek} formatMoney={formatMoney} /></Grid>
          <Grid item xs={12} sm={6} md={3}><SalesPeriodCard label="This Month" period={salesAnalytics.thisMonth} formatMoney={formatMoney} /></Grid>
          <Grid item xs={12} sm={6} md={3}><SalesPeriodCard label="This Year" period={salesAnalytics.thisYear} formatMoney={formatMoney} /></Grid>
        </Grid>
      </Section>

      <Grid container spacing={3}>
        {/* Order analytics */}
        <Grid item xs={12} md={5}>
          <Section title="Order Analytics">
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {[
                { label: 'Pending', value: orderAnalytics.pending, icon: <HourglassEmpty />, color: 'warning.main' },
                { label: 'Completed', value: orderAnalytics.completed, icon: <CheckCircle />, color: 'success.main' },
                { label: 'Cancelled', value: orderAnalytics.cancelled, icon: <Cancel />, color: 'text.secondary' },
                { label: 'Refunded', value: orderAnalytics.refunded, icon: <Replay />, color: 'error.main' },
              ].map((o) => (
                <Grid item xs={6} key={o.label}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Box sx={{ color: o.color, mb: 0.5 }}>{o.icon}</Box>
                    <Typography variant="h5" fontWeight={700}>{o.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{o.label}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            {orderChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={orderChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {orderChartData.map((_, i) => (
                      <Cell key={i} fill={ORDER_CHART_COLORS[i % ORDER_CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Alert severity="info">No orders yet</Alert>
            )}
          </Section>
        </Grid>

        {/* Financial summary */}
        <Grid item xs={12} md={7}>
          <Section title="Financial Summary">
            <Grid container spacing={2}>
              {[
                { label: 'Total Revenue', value: formatMoney(financialAnalytics.totalRevenue) },
                { label: 'Total Expenses', value: formatMoney(financialAnalytics.totalExpenses) },
                { label: 'Gross Profit', value: formatMoney(financialAnalytics.grossProfit) },
                { label: 'Net Profit', value: formatMoney(financialAnalytics.netProfit) },
                { label: 'Profit Margin', value: `${financialAnalytics.profitMarginPercent}%` },
              ].map((f) => (
                <Grid item xs={6} sm={4} key={f.label}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                    <Typography variant="h6" fontWeight={700}>{f.value}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Section>

          <Section title="Inventory Analytics">
            <Grid container spacing={2}>
              {[
                { label: 'Inventory Value', value: formatMoney(inventoryAnalytics.inventoryValue) },
                { label: 'Low Stock', value: inventoryAnalytics.lowStockProducts },
                { label: 'Out of Stock', value: inventoryAnalytics.outOfStockProducts },
                { label: 'Stock Units', value: inventoryAnalytics.totalStockItems },
                { label: 'Adjustments', value: inventoryAnalytics.inventoryAdjustments },
              ].map((i) => (
                <Grid item xs={6} sm={4} key={i.label}>
                  <Typography variant="caption" color="text.secondary">{i.label}</Typography>
                  <Typography fontWeight={700}>{i.value}</Typography>
                </Grid>
              ))}
            </Grid>
          </Section>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Section title="Subscription" subtitle="Plan, billing, and feature packs">
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Plan</Typography><Typography fontWeight={700}>{subscriptionAnalytics.planName}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Payment</Typography><Typography fontWeight={700}>{formatStatus(subscriptionAnalytics.paymentStatus)}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Start</Typography><Typography fontWeight={600}>{formatDate(subscriptionAnalytics.startDate)}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Expiry</Typography><Typography fontWeight={600}>{formatDate(subscriptionAnalytics.expiryDate)}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Days remaining</Typography><Typography fontWeight={700}>{subscriptionAnalytics.daysRemaining ?? '—'}</Typography></Grid>
            </Grid>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Feature packs</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {(subscriptionAnalytics.featurePacks || []).map((fp) => (
                <Chip
                  key={fp.key}
                  label={fp.label}
                  size="small"
                  color={fp.enabled ? 'success' : 'default'}
                  variant={fp.enabled ? 'filled' : 'outlined'}
                  icon={fp.enabled ? <CheckCircle /> : undefined}
                />
              ))}
            </Stack>
          </Section>

          <Section title="Usage Statistics">
            <UsageBar label="Products" used={usageAnalytics.products.used} limit={usageAnalytics.products.limit} percent={usageAnalytics.products.percent} />
            <UsageBar label="Users" used={usageAnalytics.users.used} limit={usageAnalytics.users.limit} percent={usageAnalytics.users.percent} />
            <UsageBar label="Storage (MB est.)" used={usageAnalytics.storage.usedMb} limit={usageAnalytics.storage.limitMb} percent={usageAnalytics.storage.percent} />
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Orders this month</Typography>
                <Typography fontWeight={700}>{usageAnalytics.ordersThisMonth}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Transactions this month</Typography>
                <Typography fontWeight={700}>{usageAnalytics.transactionsThisMonth}</Typography>
              </Grid>
            </Grid>
          </Section>

          <Section title="System Health">
            <Grid container spacing={2}>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Last login</Typography><Typography fontWeight={600}>{formatDateTime(systemHealth.lastLogin)}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Last API activity</Typography><Typography fontWeight={600}>{formatDateTime(systemHealth.lastApiActivity)}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">API requests (audit)</Typography><Typography fontWeight={700}>{systemHealth.totalApiRequests}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Failed logins (audit)</Typography><Typography fontWeight={700}>{systemHealth.failedLoginAttempts}</Typography></Grid>
            </Grid>
          </Section>
        </Grid>

        <Grid item xs={12} md={6}>
          <Section title="Customer Analytics">
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={4}><StatCard title="Total" value={customerAnalytics.totalCustomers} /></Grid>
              <Grid item xs={4}><StatCard title="New (month)" value={customerAnalytics.newCustomersThisMonth} /></Grid>
              <Grid item xs={4}><StatCard title="Returning" value={customerAnalytics.returningCustomers} /></Grid>
            </Grid>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Top customers by spending</Typography>
            <DataTable
              columns={topCustomerColumns}
              rows={customerAnalytics.topCustomers || []}
              emptyTitle="No customer data"
              emptyMessage="Customer purchase history will appear here."
            />
          </Section>

          <Section title="Top Selling Products">
            <DataTable
              columns={topProductColumns}
              rows={productAnalytics.topSelling || []}
              emptyTitle="No sales data"
              emptyMessage="Product sales will appear once orders are completed."
            />
          </Section>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Section title="Recent Activity" subtitle="Last 20 events">
            {activities?.length ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Event</TableCell>
                      <TableCell>Detail</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activities.map((a) => (
                      <TableRow key={`${a.type}-${a.id}`}>
                        <TableCell>{a.title}</TableCell>
                        <TableCell>{a.description}</TableCell>
                        <TableCell>{formatDateTime(a.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">No recent activity</Alert>
            )}
          </Section>
        </Grid>
        <Grid item xs={12} md={6}>
          <Section title="Top Categories">
            {(productAnalytics.topCategories || []).length ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {productAnalytics.topCategories.map((c) => (
                      <TableRow key={c.categoryName}>
                        <TableCell>{c.categoryName}</TableCell>
                        <TableCell align="right">{c.quantitySold}</TableCell>
                        <TableCell align="right">{formatMoney(c.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">No category sales yet</Alert>
            )}
          </Section>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Section title="Recent Orders">
            <DataTable
              columns={recentOrderColumns}
              rows={recentOrders || []}
              emptyTitle="No orders"
              emptyMessage="Orders from this business will appear here."
            />
          </Section>
        </Grid>
        <Grid item xs={12} md={6}>
          <Section title="Recent Purchase Orders">
            <DataTable
              columns={poColumns}
              rows={recentPurchaseOrders || []}
              emptyTitle="No purchase orders"
              emptyMessage="Supplier purchase orders will appear here."
            />
          </Section>
        </Grid>
      </Grid>

      {(productAnalytics.slowMoving || []).length > 0 && (
        <Section title="Slow Moving Products" subtitle="≤2 units sold in the last 90 days">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell align="right">Sold (90d)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productAnalytics.slowMoving.map((p) => (
                  <TableRow key={p.productId}>
                    <TableCell>{p.productName}</TableCell>
                    <TableCell>{p.sku || '—'}</TableCell>
                    <TableCell align="right">{p.stockQuantity}</TableCell>
                    <TableCell align="right">{p.quantitySold90d}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Section>
      )}
    </Box>
  );
}

export function DashboardSkeleton() {
  return (
    <Box>
      <Skeleton variant="rounded" height={180} sx={{ mb: 3 }} />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <Grid item xs={6} sm={4} md={3} lg={2} key={i}>
            <Skeleton variant="rounded" height={100} />
          </Grid>
        ))}
      </Grid>
      <Skeleton variant="rounded" height={300} />
    </Box>
  );
}
