import {
  Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  Button, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DashboardSection from './DashboardSection';
import EmptyState from '../../../../components/EmptyState';

function ProductMiniTable({ rows, onReorder, onAdjust }) {
  if (!rows?.length) return null;
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Product</TableCell>
          <TableCell align="right">Stock</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.slice(0, 5).map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>{p.name}</Typography>
              <Typography variant="caption" color="text.secondary">{p.sku}</Typography>
            </TableCell>
            <TableCell align="right">{p.stockQuantity}</TableCell>
            <TableCell align="right">
              <Button size="small" onClick={() => onReorder(p.id)}>Reorder</Button>
              <Button size="small" onClick={() => onAdjust(p.id)}>Adjust</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function InventoryHealthPanel({ inventory, formatMoney, loading, error, onRetry }) {
  const navigate = useNavigate();
  const summary = inventory?.summary;

  const onReorder = (productId) => navigate(`/purchase-orders?productId=${productId}`);
  const onAdjust = (productId) => navigate(`/inventory?productId=${productId}`);

  return (
    <DashboardSection title="Inventory Health" loading={loading} error={error} onRetry={onRetry}>
      {!loading && !summary && (
        <EmptyState compact illustration="store" title="No inventory data" message="Add products to track inventory health." />
      )}
      {!loading && summary && (
        <Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Chip label={`Value: ${formatMoney(summary.totalValue)}`} color="primary" variant="outlined" />
            <Chip label={`Low: ${summary.lowStockCount}`} color="warning" variant="outlined" />
            <Chip label={`Out: ${summary.outOfStockCount}`} color="error" variant="outlined" />
            <Chip label={`Overstocked: ${summary.overstockedCount}`} variant="outlined" />
          </Stack>

          {summary.outOfStockCount > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} color="error.main" gutterBottom>Out of Stock</Typography>
              <ProductMiniTable rows={inventory.outOfStock} onReorder={onReorder} onAdjust={onAdjust} />
            </Box>
          )}

          {summary.lowStockCount > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} color="warning.main" gutterBottom>Low Stock</Typography>
              <ProductMiniTable rows={inventory.lowStock} onReorder={onReorder} onAdjust={onAdjust} />
            </Box>
          )}

          {inventory.recentMovements?.length > 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>Recent Stock Movement</Typography>
              {inventory.recentMovements.slice(0, 5).map((m, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="body2" noWrap sx={{ maxWidth: '70%' }}>
                    {m.productName} · {m.type}
                  </Typography>
                  <Typography variant="body2" color={m.quantity >= 0 ? 'success.main' : 'error.main'}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {summary.lowStockCount === 0 && summary.outOfStockCount === 0 && (
            <EmptyState compact illustration="store" title="Inventory healthy" message="No stock issues detected." />
          )}
        </Box>
      )}
    </DashboardSection>
  );
}
