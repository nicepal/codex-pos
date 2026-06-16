import { Box, Typography, ToggleButtonGroup, ToggleButton, IconButton, Tooltip } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { selectAuth } from '../../../../features/auth/authSlice';

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardHeader({ range, onRangeChange, onRefresh, isRefreshing, generatedAt }) {
  const { user } = useSelector(selectAuth);
  const name = user?.first_name || user?.email?.split('@')[0] || 'there';
  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box>
        <Typography variant="h5" fontWeight={700}>
          {getGreeting()}, {name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {dateStr}
          {generatedAt && ` · Updated ${new Date(generatedAt).toLocaleTimeString()}`}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          value={range}
          exclusive
          onChange={(_, v) => v && onRangeChange(v)}
          size="small"
          sx={{ flexWrap: 'wrap' }}
        >
          {RANGES.map((r) => (
            <ToggleButton key={r.value} value={r.value} sx={{ px: { xs: 1.5, sm: 2 } }}>
              {r.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Tooltip title="Refresh dashboard">
          <IconButton onClick={onRefresh} disabled={isRefreshing} size="small">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
