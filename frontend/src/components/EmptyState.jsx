import { Box, Typography, Button, Grid, alpha, useTheme } from '@mui/material';
import { Add } from '@mui/icons-material';
import {
  LocalOffer, TrendingUp, Groups, Inventory2, SupportAgent,
} from '@mui/icons-material';
import EmptyStateIllustration from './EmptyStateIllustration';

const BENEFIT_ICONS = {
  tag: LocalOffer,
  chart: TrendingUp,
  people: Groups,
  inventory: Inventory2,
  support: SupportAgent,
};

function BenefitItem({ icon, title, description }) {
  const theme = useTheme();
  const Icon = BENEFIT_ICONS[icon] || LocalOffer;

  return (
    <Box
      sx={{
        p: { xs: 2.5, md: 3 },
        textAlign: { xs: 'center', md: 'left' },
        borderTop: { xs: '1px solid', md: 'none' },
        borderColor: 'divider',
        borderRight: { md: '1px solid' },
        '&:last-child': { borderRight: { md: 'none' } },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          mb: 1.5,
          mx: { xs: 'auto', md: 0 },
        }}
      >
        <Icon sx={{ fontSize: 20, color: 'primary.main' }} />
      </Box>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
        {description}
      </Typography>
    </Box>
  );
}

export default function EmptyState({
  icon,
  illustration,
  title = 'No data yet',
  message,
  actionLabel,
  actionIcon,
  onAction,
  benefits,
  compact = false,
}) {
  const theme = useTheme();
  const illusSize = compact ? 72 : 120;

  return (
    <Box
      sx={{
        borderRadius: compact ? 2 : 3,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ textAlign: 'center', py: compact ? 3 : { xs: 5, md: 7 }, px: compact ? 2 : 3 }}>
        {icon || <EmptyStateIllustration type={illustration || 'store'} size={illusSize} />}
        <Typography variant={compact ? 'subtitle1' : 'h5'} fontWeight={700} gutterBottom>
          {title}
        </Typography>
        {message && (
          <Typography
            variant={compact ? 'body2' : 'body1'}
            color="text.secondary"
            sx={{ maxWidth: compact ? 320 : 440, mx: 'auto', lineHeight: 1.6 }}
          >
            {message}
          </Typography>
        )}
        {actionLabel && onAction && (
          <Button
            variant="contained"
            size={compact ? 'medium' : 'large'}
            startIcon={actionIcon || <Add />}
            onClick={onAction}
            sx={{ mt: compact ? 2 : 3, px: compact ? 2 : 3 }}
          >
            {actionLabel}
          </Button>
        )}
      </Box>

      {benefits?.length > 0 && !compact && (
        <Box
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.primary.main, 0.02),
          }}
        >
          <Grid container>
            {benefits.map((item) => (
              <Grid item xs={12} md={4} key={item.title}>
                <BenefitItem {...item} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
