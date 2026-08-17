import { SimpleGrid } from '@mantine/core';
import {
  AccountBalanceWallet, ShoppingCart, People, Inventory,
  TrendingUp, Receipt, TrendingDown, MonetizationOn,
} from '@mui/icons-material';
import { CODEX_TOKENS } from '../../../../design-system';
import KpiCard from './KpiCard';

export default function KpiGrid({ kpis, formatMoney, onNavigate }) {
  if (!kpis) return null;

  const items = [
    {
      key: 'todaySales',
      title: "Today's Sales",
      kpi: kpis.todaySales,
      icon: <AccountBalanceWallet style={{ color: CODEX_TOKENS.primary }} />,
      path: '/reports',
      money: true,
    },
    {
      key: 'todayProfit',
      title: "Today's Profit",
      kpi: kpis.todayProfit,
      icon: <MonetizationOn style={{ color: CODEX_TOKENS.success }} />,
      path: '/reports',
      money: true,
    },
    {
      key: 'todayOrders',
      title: "Today's Orders",
      kpi: kpis.todayOrders,
      icon: <ShoppingCart style={{ color: CODEX_TOKENS.warning }} />,
      path: '/orders',
      money: false,
    },
    {
      key: 'customersToday',
      title: 'Customers Today',
      kpi: kpis.customersToday,
      icon: <People style={{ color: '#7c3aed' }} />,
      path: '/customers',
      money: false,
    },
    {
      key: 'inventoryValue',
      title: 'Inventory Value',
      kpi: kpis.inventoryValue,
      icon: <Inventory style={{ color: '#3b82f6' }} />,
      path: '/inventory',
      money: true,
    },
    {
      key: 'monthlyRevenue',
      title: 'Monthly Revenue',
      kpi: kpis.monthlyRevenue,
      icon: <TrendingUp style={{ color: CODEX_TOKENS.success }} />,
      path: '/reports',
      money: true,
    },
    {
      key: 'monthlyExpenses',
      title: 'Monthly Expenses',
      kpi: kpis.monthlyExpenses,
      icon: <Receipt style={{ color: CODEX_TOKENS.error }} />,
      path: '/expenses',
      money: true,
    },
    {
      key: 'netProfit',
      title: 'Net Profit',
      kpi: kpis.netProfit,
      icon:
        kpis.netProfit?.trend === 'down' ? (
          <TrendingDown style={{ color: CODEX_TOKENS.error }} />
        ) : (
          <TrendingUp style={{ color: CODEX_TOKENS.success }} />
        ),
      path: '/reports',
      money: true,
    },
  ];

  return (
    <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
      {items.map((item) => (
        <KpiCard
          key={item.key}
          title={item.title}
          kpi={item.kpi}
          icon={item.icon}
          formatValue={item.money ? formatMoney : (v) => String(Math.round(v))}
          onClick={() => onNavigate?.(item.path)}
        />
      ))}
    </SimpleGrid>
  );
}
