import { Link } from 'react-router-dom';
import { Box, Typography, alpha } from '@mui/material';
import { resolveImageUrl } from '../../utils/imageUrl';
import { STOREFRONT_COLORS } from './storefrontTheme';

export default function CollectionTile({ category, basePath }) {
  const imageUrl = resolveImageUrl(category.image_url);

  return (
    <Box
      component={Link}
      to={`${basePath}/shop?category=${category.slug}`}
      sx={{
        position: 'relative',
        display: 'block',
        borderRadius: 0,
        overflow: 'hidden',
        textDecoration: 'none',
        aspectRatio: { xs: '4/5', md: '3/4' },
        bgcolor: STOREFRONT_COLORS.paperLight,
        '&:hover img': { transform: 'scale(1.05)' },
      }}
    >
      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt={category.name}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.6s ease',
          }}
        />
      ) : (
        <Box sx={{ width: '100%', height: '100%', bgcolor: alpha('#fff', 0.05) }} />
      )}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          pb: 3,
        }}
      >
        <Typography
          variant="h6"
          fontWeight={600}
          color="#fff"
          sx={{ letterSpacing: '0.02em' }}
        >
          {category.name}
        </Typography>
      </Box>
    </Box>
  );
}
