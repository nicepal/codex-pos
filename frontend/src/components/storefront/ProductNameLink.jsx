import { Link, useOutletContext } from 'react-router-dom';
import { Typography } from '@mui/material';

/**
 * Clickable product name → storefront product detail page.
 */
export default function ProductNameLink({
  slug,
  name,
  basePath: basePathProp,
  sx = {},
  onClick,
  ...typographyProps
}) {
  const ctx = useOutletContext() || {};
  const basePath = basePathProp || ctx.basePath;
  const label = name || 'Product';

  if (!slug || !basePath) {
    return (
      <Typography component="span" {...typographyProps} sx={sx}>
        {label}
      </Typography>
    );
  }

  return (
    <Typography
      component={Link}
      to={`${basePath}/product/${slug}`}
      onClick={onClick}
      {...typographyProps}
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        '&:hover': { color: 'primary.main', textDecoration: 'underline' },
        ...sx,
      }}
    >
      {label}
    </Typography>
  );
}
