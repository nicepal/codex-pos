import {
  ShoppingCart, Inventory, SwapHoriz, Person, Receipt,
} from '@mui/icons-material';
import { Typography, Box, List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DashboardSection from './DashboardSection';
import EmptyState from '../../../../components/EmptyState';

const TYPE_ICONS = {
  sale: ShoppingCart,
  product: Inventory,
  stock: SwapHoriz,
  purchase_order: Receipt,
  customer: Person,
};

const TYPE_COLORS = {
  sale: 'primary',
  product: 'secondary',
  stock: 'info',
  purchase_order: 'warning',
  customer: 'success',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ActivityTimeline({ activity, loading, error, onRetry }) {
  const navigate = useNavigate();

  return (
    <DashboardSection title="Recent Activity" loading={loading} error={error} onRetry={onRetry}>
      {!loading && !activity?.length && (
        <EmptyState compact illustration="store" title="No recent activity" message="Business activity will show here." />
      )}
      {!loading && activity?.length > 0 && (
        <List disablePadding>
          {activity.map((item, i) => {
            const Icon = TYPE_ICONS[item.type] || Receipt;
            const color = TYPE_COLORS[item.type] || 'primary';
            return (
              <Box key={`${item.id}-${i}`}>
                <ListItem
                  alignItems="flex-start"
                  sx={{ px: 0, cursor: item.href ? 'pointer' : 'default' }}
                  onClick={() => item.href && navigate(item.href)}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: `${color}.light`, color: `${color}.dark` }}>
                      <Icon sx={{ fontSize: 18 }} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{item.title}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                          {timeAgo(item.createdAt)}
                        </Typography>
                      </Box>
                    }
                    secondary={item.description}
                  />
                </ListItem>
                {i < activity.length - 1 && <Divider component="li" />}
              </Box>
            );
          })}
        </List>
      )}
    </DashboardSection>
  );
}
