import { List, ListItemButton, ListItemIcon, ListItemText, Chip, Box, Typography } from '@mui/material';
import {
  ErrorOutline, WarningAmber, CheckCircle, ChevronRight,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import DashboardSection from './DashboardSection';

const SEVERITY = {
  critical: { color: 'error', Icon: ErrorOutline },
  warning: { color: 'warning', Icon: WarningAmber },
  good: { color: 'success', Icon: CheckCircle },
};

export default function AlertsPanel({ alerts, loading, error, onRetry }) {
  const navigate = useNavigate();
  const actionable = (alerts || []).filter((a) => a.type !== 'all_clear');
  const allClear = !actionable.length;

  return (
    <DashboardSection title="Business Alerts" loading={loading} error={error} onRetry={onRetry}>
      {!loading && allClear && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
          <CheckCircle color="success" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>All clear</Typography>
            <Typography variant="body2" color="text.secondary">
              No actions needed right now. Your business is running smoothly.
            </Typography>
          </Box>
        </Box>
      )}
      {!loading && actionable.length > 0 && (
        <List disablePadding dense>
          {actionable.map((alert) => {
            const cfg = SEVERITY[alert.severity] || SEVERITY.warning;
            return (
              <ListItemButton
                key={alert.id}
                onClick={() => alert.href && navigate(alert.href)}
                disabled={!alert.href}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <cfg.Icon color={cfg.color} fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={alert.title}
                  secondary={alert.type === 'subscription_expiry'
                    ? `${alert.count} day${alert.count !== 1 ? 's' : ''} remaining`
                    : `${alert.count} item${alert.count !== 1 ? 's' : ''}`}
                />
                <Chip label={alert.severity} size="small" color={cfg.color} variant="outlined" sx={{ mr: 0.5 }} />
                {alert.href && <ChevronRight fontSize="small" color="action" />}
              </ListItemButton>
            );
          })}
        </List>
      )}
    </DashboardSection>
  );
}
