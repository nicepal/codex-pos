import { Box, Button, Typography } from '@mui/material';
import {
  PointOfSale, AddBox, LocalShipping, PersonAdd, Business,
  ShoppingBag, Assessment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const ACTIONS = [
  { label: 'New Sale', icon: PointOfSale, path: '/pos', color: 'primary' },
  { label: 'Add Product', icon: AddBox, path: '/products?action=create', color: 'primary' },
  { label: 'Purchase Stock', icon: LocalShipping, path: '/purchase-orders?action=create', color: 'secondary' },
  { label: 'Add Customer', icon: PersonAdd, path: '/customers?action=create', color: 'secondary' },
  { label: 'Add Supplier', icon: Business, path: '/suppliers?action=create', color: 'inherit' },
  { label: 'Create PO', icon: ShoppingBag, path: '/purchase-orders', color: 'inherit' },
  { label: 'View Reports', icon: Assessment, path: '/reports', color: 'inherit' },
];

export default function QuickActionsBar() {
  const navigate = useNavigate();

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
        Quick Actions
      </Typography>
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          overflowX: 'auto',
          pb: 0.5,
          mx: { xs: -1, sm: 0 },
          px: { xs: 1, sm: 0 },
          '&::-webkit-scrollbar': { height: 4 },
        }}
      >
        {ACTIONS.map((action) => (
          <Button
            key={action.label}
            variant="outlined"
            startIcon={<action.icon />}
            onClick={() => navigate(action.path)}
            color={action.color}
            sx={{
              minHeight: 72,
              minWidth: { xs: 140, sm: 160 },
              flexShrink: 0,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 1.5,
              px: 2,
              textTransform: 'none',
              fontWeight: 600,
              '& .MuiButton-startIcon': { m: 0, mb: 0.5 },
            }}
          >
            {action.label}
          </Button>
        ))}
      </Box>
    </Box>
  );
}
