import { useState } from 'react';
import { Box } from '@mui/material';
import { RestaurantMenuOutlined } from '@mui/icons-material';
import { resolveImageUrl, resolveProductImageSrc } from '../../utils/imageUrl';
import { SF } from './storefrontTheme';

/**
 * Product image with consistent aspect ratio and neutral empty/fail placeholder.
 */
export default function ProductImage({
  src,
  product,
  alt = '',
  ratio = SF.imageRatio,
  borderRadius = 0,
  objectFit = 'cover',
  sx = {},
}) {
  const [failed, setFailed] = useState(false);
  const url = product ? resolveProductImageSrc(product) : resolveImageUrl(src);
  const showImg = Boolean(url) && !failed;

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: ratio,
        bgcolor: SF.colors.paperMuted,
        borderRadius,
        overflow: 'hidden',
        ...sx,
      }}
    >
      {showImg ? (
        <Box
          component="img"
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit,
          }}
        />
      ) : (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            bgcolor: SF.colors.paperMuted,
          }}
          aria-hidden
        >
          <RestaurantMenuOutlined sx={{ fontSize: 28, color: SF.colors.textFaint, opacity: 0.45 }} />
        </Box>
      )}
    </Box>
  );
}

/** Tiny inline thumb used in cart lines and search results */
export function ProductThumb({ src, product, alt = '', size = 56 }) {
  const [failed, setFailed] = useState(false);
  const url = product ? resolveProductImageSrc(product) : resolveImageUrl(src);
  const showImg = Boolean(url) && !failed;

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: SF.radius.sm,
        overflow: 'hidden',
        bgcolor: SF.colors.paperMuted,
        flexShrink: 0,
      }}
    >
      {showImg ? (
        <Box
          component="img"
          src={url}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RestaurantMenuOutlined sx={{ fontSize: 18, color: SF.colors.textFaint, opacity: 0.4 }} />
        </Box>
      )}
    </Box>
  );
}
