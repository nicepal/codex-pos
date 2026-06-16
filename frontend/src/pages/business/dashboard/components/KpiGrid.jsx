import { Grid } from '@mui/material';
import {
  AccountBalanceWallet, ShoppingCart, People, Inventory,
  TrendingUp, Receipt, TrendingDown, MonetizationOn,
} from '@mui/icons-material';
import KpiCard from './KpiCard';

export default function KpiGrid({ kpis, formatMoney, onNavigate }) {
  if (!kpis) return null;

  const items = [
    {
      key: 'todaySales',
      title: "Today's Sales",
      kpi: kpis.todaySales,
      icon: <AccountBalanceWallet color="primary" />,
      path: '/reports',
      money: true,
    },
    {
      key: 'todayProfit',
      title: "Today's Profit",
      kpi: kpis.todayProfit,
      icon: <MonetizationOn color="success" />,
      path: '/reports',
      money: true,
    },
    {
      key: 'todayOrders',
      title: "Today's Orders",
      kpi: kpis.todayOrders,
      icon: <ShoppingCart color="warning" />,
      path: '/orders',
      money: false,
    },
    {
      key: 'customersToday',
      title: 'Customers Today',
      kpi: kpis.customersToday,
      icon: <People color="secondary" />,
      path: '/customers',
      money: false,
    },
    {
      key: 'inventoryValue',
      title: 'Inventory Value',
      kpi: kpis.inventoryValue,
      icon: <Inventory color="info" />,
      path: '/inventory',
      money: true,
    },
    {
      key: 'monthlyRevenue',
      title: 'Monthly Revenue',
      kpi: kpis.monthlyRevenue,
      icon: <TrendingUp color="success" />,
      path: '/reports',
      money: true,
    },
    {
      key: 'monthlyExpenses',
      title: 'Monthly Expenses',
      kpi: kpis.monthlyExpenses,
      icon: <Receipt color="error" />,
      path: '/expenses',
      money: true,
    },
    {
      key: 'netProfit',
      title: 'Net Profit',
      kpi: kpis.netProfit,
      icon: kpis.netProfit?.trend === 'down'
        ? <TrendingDown color="error" />
        : <TrendingUp color="success" />,
      path: '/reports',
      money: true,
    },
  ];

  return (
    <Grid container spacing={2}>
      {items.map((item) => (
        <Grid item xs={6} sm={6} md={3} key={item.key}>
          <KpiCard
            title={item.title}
            kpi={item.kpi}
            icon={item.icon}
            formatValue={item.money ? formatMoney : (v) => String(Math.round(v))}
            onClick={() => onNavigate?.(item.path)}
          />
        </Grid>
      ))}
    </Grid>
  );
}
