import { Box, Button, Text, Group, Stack } from '@mantine/core';
import {
  PointOfSale, AddBox, LocalShipping, PersonAdd, Business,
  ShoppingBag, Assessment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const ACTIONS = [
  { label: 'New Sale', icon: PointOfSale, path: '/pos' },
  { label: 'Add Product', icon: AddBox, path: '/products?action=create' },
  { label: 'Purchase Stock', icon: LocalShipping, path: '/purchase-orders?action=create' },
  { label: 'Add Customer', icon: PersonAdd, path: '/customers?action=create' },
  { label: 'Add Supplier', icon: Business, path: '/suppliers?action=create' },
  { label: 'Create PO', icon: ShoppingBag, path: '/purchase-orders' },
  { label: 'View Reports', icon: Assessment, path: '/reports' },
];

export default function QuickActionsBar() {
  const navigate = useNavigate();

  return (
    <Box mb="md">
      <Text size="sm" fw={700} c="dimmed" mb="sm">
        Quick Actions
      </Text>
      <Group
        gap="sm"
        wrap="nowrap"
        style={{ overflowX: 'auto', paddingBottom: 4 }}
      >
        {ACTIONS.map((action) => (
          <Button
            key={action.label}
            variant="default"
            onClick={() => navigate(action.path)}
            style={{
              minHeight: 72,
              minWidth: 140,
              flexShrink: 0,
              flexDirection: 'column',
              height: 'auto',
              paddingTop: 12,
              paddingBottom: 12,
            }}
          >
            <Stack gap={4} align="center">
              <action.icon fontSize="small" />
              <span>{action.label}</span>
            </Stack>
          </Button>
        ))}
      </Group>
    </Box>
  );
}
