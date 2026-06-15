import { Card, CardContent, Typography, Box } from '@mui/material';

export default function StatCard({ title, value, icon, subtitle, color }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" variant="body2">{title}</Typography>
            <Typography variant="h4" fontWeight={700} color={color}>{value}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
          </Box>
          {icon}
        </Box>
      </CardContent>
    </Card>
  );
}
