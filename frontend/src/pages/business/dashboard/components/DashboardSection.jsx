import { Card, CardContent, Typography, Box, Skeleton, Alert, Button } from '@mui/material';
import { Refresh } from '@mui/icons-material';

export default function DashboardSection({
  title,
  subtitle,
  action,
  loading,
  error,
  onRetry,
  children,
  noPadding,
}) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: noPadding ? 0 : 2, '&:last-child': { pb: noPadding ? 0 : 2 } }}>
        {(title || action) && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, px: noPadding ? 2 : 0, pt: noPadding ? 2 : 0 }}>
            <Box>
              {title && <Typography variant="h6" fontWeight={700}>{title}</Typography>}
              {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
            </Box>
            {action}
          </Box>
        )}
        {error && (
          <Alert
            severity="error"
            action={onRetry && (
              <Button color="inherit" size="small" startIcon={<Refresh />} onClick={onRetry}>
                Retry
              </Button>
            )}
            sx={{ mb: 2, mx: noPadding ? 2 : 0 }}
          >
            {error}
          </Alert>
        )}
        {loading ? (
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="rounded" height={120} />
            <Skeleton variant="text" sx={{ mt: 1 }} />
            <Skeleton variant="text" width="60%" />
          </Box>
        ) : children}
      </CardContent>
    </Card>
  );
}
