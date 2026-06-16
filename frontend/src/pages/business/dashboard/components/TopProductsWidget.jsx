import { List, ListItem, ListItemText, LinearProgress, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DashboardSection from './DashboardSection';
import EmptyState from '../../../../components/EmptyState';

export default function TopProductsWidget({ products, formatMoney, loading, error, onRetry }) {
  const navigate = useNavigate();
  const maxRevenue = products?.[0]?.revenue || 1;

  return (
    <DashboardSection title="Top Selling Products" subtitle="Top 10 by units sold" loading={loading} error={error} onRetry={onRetry}>
      {!loading && !products?.length && (
        <EmptyState compact illustration="store" title="No product sales yet" message="Products will appear here once you start selling." />
      )}
      {!loading && products?.length > 0 && (
        <List disablePadding dense>
          {products.map((p, i) => (
            <ListItem
              key={p.productId || p.productName}
              disablePadding
              sx={{ flexDirection: 'column', alignItems: 'stretch', mb: 1.5, cursor: 'pointer' }}
              onClick={() => p.productId && navigate(`/products`)}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 0.5 }}>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {i + 1}. {p.productName}
                    </Typography>
                  }
                  secondary={`${p.unitsSold} units sold`}
                />
                <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ flexShrink: 0, ml: 1 }}>
                  {formatMoney(p.revenue)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (p.revenue / maxRevenue) * 100)}
                sx={{ height: 4, borderRadius: 2 }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </DashboardSection>
  );
}
