import { Card, CardActionArea, CardContent, Typography, Box } from '@mui/material';
import TrendBadge from './TrendBadge';

export default function KpiCard({
  title,
  value,
  icon,
  kpi,
  onClick,
  formatValue,
}) {
  const displayValue = formatValue ? formatValue(kpi?.value ?? value) : (value ?? kpi?.value ?? '—');

  const content = (
    <CardContent sx={{ py: 2, px: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography color="text.secondary" variant="body2" noWrap>{title}</Typography>
          <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5, lineHeight: 1.2 }}>
            {displayValue}
          </Typography>
          {kpi && (
            <TrendBadge
              changePercent={kpi.changePercent}
              comparisonLabel={kpi.comparisonLabel}
              trend={kpi.trend}
            />
          )}
        </Box>
        {icon && (
          <Box sx={{ opacity: 0.85, ml: 1, flexShrink: 0 }}>{icon}</Box>
        )}
      </Box>
    </CardContent>
  );

  if (onClick) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
          {content}
        </CardActionArea>
      </Card>
    );
  }

  return <Card sx={{ height: '100%' }}>{content}</Card>;
}
