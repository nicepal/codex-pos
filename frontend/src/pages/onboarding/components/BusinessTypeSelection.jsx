import {
  Box, Card, CardActionArea, CardContent, Typography, Grid, Stack, alpha,
} from '@mui/material';
import {
  Storefront, Restaurant, LocalGroceryStore, Checkroom, Devices,
  Spa, Medication, Warehouse, Business, CheckCircle,
} from '@mui/icons-material';
import { FEATURE_PACKS } from '../../../config/featurePackLabels';

const ICONS = {
  storefront: Storefront,
  restaurant: Restaurant,
  local_grocery_store: LocalGroceryStore,
  checkroom: Checkroom,
  devices: Devices,
  spa: Spa,
  medication: Medication,
  warehouse: Warehouse,
  business: Business,
};

export default function BusinessTypeSelection({ types = [], selected, onSelect }) {
  return (
    <Box>
      <Typography variant="h4" fontWeight={800} letterSpacing="-0.03em" gutterBottom>
        What kind of business are you running?
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 640 }}>
        We&apos;ll set up a starter catalog that matches your business — categories, products, and stock you can edit anytime.
      </Typography>

      <Grid container spacing={2}>
        {types.map((type) => {
          const Icon = ICONS[type.icon] || Business;
          const isSelected = selected === type.id;
          return (
            <Grid item xs={12} sm={6} md={4} key={type.id}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  border: '2px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  bgcolor: isSelected ? (t) => alpha(t.palette.primary.main, 0.06) : 'background.paper',
                  transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
                  '&:hover': {
                    borderColor: 'primary.light',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => onSelect(type.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(type.id);
                    }
                  }}
                  aria-pressed={isSelected}
                  aria-label={`Select ${type.label}`}
                  sx={{ height: '100%', alignItems: 'stretch' }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                          color: 'primary.main',
                        }}
                      >
                        <Icon />
                      </Box>
                      {isSelected && <CheckCircle color="primary" aria-hidden />}
                    </Stack>
                    <Typography fontWeight={700} gutterBottom>{type.label}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, minHeight: 40 }}>
                      {type.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ~{type.estimatedCategories} categories · ~{type.estimatedProducts} products
                    </Typography>
                    {type.includesFeaturePacks?.length > 0 && (
                      <Stack spacing={0.25} sx={{ mt: 0.75 }}>
                        {type.includesFeaturePacks.map((packKey) => (
                          <Typography key={packKey} variant="caption" color="success.main" display="block">
                            {FEATURE_PACKS[packKey]?.label || packKey} included
                          </Typography>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
