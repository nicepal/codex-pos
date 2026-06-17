import { Grid, Box, Typography } from '@mui/material';
import { Today, DateRange, CalendarMonth, CalendarToday } from '@mui/icons-material';
import KpiCard from '../../dashboard/components/KpiCard';

const PERIODS = [
  { key: 'today', title: "Today's Expenses", icon: <Today color="primary" /> },
  { key: 'thisWeek', title: 'This Week', icon: <DateRange color="secondary" /> },
  { key: 'thisMonth', title: 'This Month', icon: <CalendarMonth color="info" /> },
  { key: 'thisYear', title: 'This Year', icon: <CalendarToday color="warning" /> },
];

export default function ExpenseKpiGrid({ kpis, formatMoney }) {
  if (!kpis) return null;

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {PERIODS.map(({ key, title, icon }) => {
        const kpi = kpis[key];
        return (
          <Grid item xs={12} sm={6} md={3} key={key}>
            <Box>
              <KpiCard
                title={title}
                icon={icon}
                kpi={kpi}
                formatValue={(v) => formatMoney(v)}
                value={kpi?.value}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 2.5, mt: -0.5 }}>
                {kpi?.count ?? 0} expense{(kpi?.count ?? 0) === 1 ? '' : 's'}
              </Typography>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}
