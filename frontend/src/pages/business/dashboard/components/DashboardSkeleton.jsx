import { Box, Grid, Skeleton, Card, CardContent } from '@mui/material';

function KpiSkeleton() {
  return (
    <Card>
      <CardContent>
        <Skeleton width="60%" height={20} />
        <Skeleton width="80%" height={40} sx={{ mt: 1 }} />
        <Skeleton width="50%" height={16} sx={{ mt: 1 }} />
      </CardContent>
    </Card>
  );
}

export default function DashboardSkeleton() {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Skeleton width={200} height={36} />
          <Skeleton width={140} height={20} sx={{ mt: 1 }} />
        </Box>
        <Skeleton width={280} height={40} />
      </Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Grid item xs={6} sm={6} md={3} key={i}>
            <KpiSkeleton />
          </Grid>
        ))}
      </Grid>
      <Skeleton variant="rounded" height={72} sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        <Grid item xs={12} lg={4}>
          <Skeleton variant="rounded" height={360} />
        </Grid>
        <Grid item xs={12} lg={8}>
          <Skeleton variant="rounded" height={360} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Skeleton variant="rounded" height={320} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Skeleton variant="rounded" height={320} />
        </Grid>
      </Grid>
    </Box>
  );
}
