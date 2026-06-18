import { Grid, Paper, Typography, Box } from '@mui/material';

const ITEMS = [
  { key: 'products_imported', label: 'Imported', color: 'success.main' },
  { key: 'products_updated', label: 'Updated', color: 'info.main' },
  { key: 'variants_imported', label: 'Variants', color: 'primary.main' },
  { key: 'images_imported', label: 'Images', color: 'secondary.main' },
  { key: 'collections_imported', label: 'Categories', color: 'text.primary' },
  { key: 'errors', label: 'Errors', color: 'error.main' },
];

export default function ImportSummary({ totals }) {
  const t = totals || {};
  return (
    <Box>
      <Grid container spacing={2}>
        {ITEMS.map((item) => (
          <Grid item xs={6} sm={4} md={2} key={item.key}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" sx={{ color: item.color, fontWeight: 700 }}>
                {t[item.key] ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">{item.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
