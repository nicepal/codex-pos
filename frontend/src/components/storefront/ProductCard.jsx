import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Button, Stack, Chip, alpha,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import {
  addToCart, updateCartQty, selectCartQtyForProduct,
} from '../../features/storefront/cartSlice';
import ProductImage from './ProductImage';
import QuantitySelector from './QuantitySelector';
import useStoreCurrency from '../../hooks/useStoreCurrency';
import { customerFacingDescription } from '../../utils/storefrontContent';
import { resolveProductImageSrc } from '../../utils/imageUrl';
import { storeNotifyCartAdded } from '../../utils/storeNotify';
import { SF } from './storefrontTheme';

function cartPayload(product) {
  return {
    product_id: product.id,
    name: product.name,
    slug: product.slug,
    sale_price: parseFloat(product.sale_price),
    category_name: product.category_name,
    image_url: resolveProductImageSrc(product) || product.image_url,
    sku: product.sku,
  };
}

/**
 * Premium product card — image, category badge, name, description, price, Add.
 */
export default function ProductCard({
  product,
  primaryColor = '#2563eb',
  onOpenDetails,
  showStock = true,
}) {
  const { formatMoney } = useStoreCurrency();
  const dispatch = useDispatch();
  const qtyInCart = useSelector(selectCartQtyForProduct(product.id));
  const outOfStock = Number(product.stock_quantity) <= 0;
  const compareAt = product.compare_at_price != null ? parseFloat(product.compare_at_price) : null;
  const salePrice = parseFloat(product.sale_price);
  const hasDiscount = compareAt > salePrice && salePrice > 0;
  const hasVariants = Boolean(product.has_variants);
  const shortDesc = customerFacingDescription(product.description);
  const categoryName = product.category_name;

  const openDetails = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onOpenDetails?.(product);
  };

  const handleAdd = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (outOfStock) return;
    if (hasVariants) {
      openDetails(e);
      return;
    }
    dispatch(addToCart(cartPayload(product)));
    storeNotifyCartAdded(product.name, 1);
  };

  const handleQty = (q) => {
    if (hasVariants) {
      openDetails();
      return;
    }
    dispatch(updateCartQty({
      product_id: product.id,
      quantity: q,
    }));
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: `${SF.radius.lg}px`,
        overflow: 'hidden',
        bgcolor: SF.colors.paper,
        border: '1px solid',
        borderColor: 'var(--store-border, ' + SF.colors.border + ')',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
        transition: 'box-shadow 0.18s ease, border-color 0.18s ease, transform 0.18s ease',
        '&:hover': {
          borderColor: alpha(primaryColor, 0.32),
          boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Box
        role="button"
        tabIndex={0}
        onClick={openDetails}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDetails(e); }}
        aria-label={`View ${product.name}`}
        sx={{ cursor: 'pointer', textAlign: 'left', flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <Box sx={{ position: 'relative' }}>
          <ProductImage
            product={product}
            alt={product.name}
            ratio={SF.imageRatio}
            borderRadius={0}
            sx={{ filter: outOfStock ? 'grayscale(0.45)' : 'none' }}
          />
          {categoryName && (
            <Chip
              label={categoryName}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                height: 22,
                maxWidth: 'calc(100% - 16px)',
                fontSize: 10,
                fontWeight: 700,
                bgcolor: 'rgba(255,255,255,0.94)',
                color: SF.colors.textMuted,
                borderRadius: `${SF.radius.sm}px`,
                boxShadow: '0 1px 4px rgba(15,23,42,0.08)',
                '& .MuiChip-label': { px: 0.85 },
              }}
            />
          )}
          {outOfStock && showStock && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(255,255,255,0.62)',
              }}
            >
              <Chip
                label="Out of stock"
                size="small"
                sx={{
                  height: 24,
                  fontSize: 11,
                  fontWeight: 700,
                  bgcolor: 'rgba(17,24,39,0.88)',
                  color: '#fff',
                  borderRadius: `${SF.radius.sm}px`,
                }}
              />
            </Box>
          )}
          {hasDiscount && !outOfStock && (
            <Chip
              label="Sale"
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                height: 22,
                fontSize: 10,
                fontWeight: 700,
                bgcolor: alpha(primaryColor, 0.12),
                color: primaryColor,
                borderRadius: `${SF.radius.sm}px`,
              }}
            />
          )}
        </Box>

        <Box sx={{ px: 1.35, pt: 1.1, pb: 0.35, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography
            component="h3"
            fontWeight={650}
            sx={{
              fontSize: { xs: 13.5, md: 14.5 },
              lineHeight: 1.35,
              letterSpacing: '-0.01em',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.name}
          </Typography>
          {shortDesc && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                mt: 0.4,
                display: { xs: 'none', xsm: '-webkit-box' },
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.35,
                fontSize: 12.5,
              }}
            >
              {shortDesc}
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ px: 1.35, pb: 1.25, pt: 0.85 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography fontWeight={750} sx={{ fontSize: { xs: 14.5, md: 15.5 }, letterSpacing: '-0.02em' }}>
              {formatMoney(salePrice)}
            </Typography>
            {hasDiscount && (
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ textDecoration: 'line-through', fontSize: 11 }}
              >
                {formatMoney(compareAt)}
              </Typography>
            )}
          </Stack>

          {outOfStock ? (
            <Typography variant="caption" color="text.disabled" fontWeight={650} sx={{ fontSize: 11.5 }}>
              Out of stock
            </Typography>
          ) : hasVariants ? (
            <Button
              size="small"
              variant="contained"
              onClick={openDetails}
              sx={{
                minWidth: 0,
                px: 1.35,
                height: 34,
                fontSize: 12.5,
                fontWeight: 700,
                borderRadius: `${SF.radius.sm}px`,
                bgcolor: 'var(--store-primary, ' + primaryColor + ')',
                '&:hover': { bgcolor: 'var(--store-primary-hover, ' + alpha(primaryColor, 0.9) + ')' },
              }}
            >
              Options
            </Button>
          ) : qtyInCart > 0 ? (
            <QuantitySelector
              value={qtyInCart}
              onChange={handleQty}
              allowZero
              size="small"
              primaryColor={primaryColor}
              max={Math.max(99, Number(product.stock_quantity) || 99)}
            />
          ) : (
            <Button
              size="small"
              variant="contained"
              startIcon={<Add sx={{ fontSize: '16px !important' }} />}
              onClick={handleAdd}
              aria-label={`Add ${product.name} to cart`}
              sx={{
                minWidth: 0,
                px: 1.35,
                height: 34,
                fontSize: 12.5,
                fontWeight: 700,
                borderRadius: `${SF.radius.sm}px`,
                bgcolor: 'var(--store-primary, ' + primaryColor + ')',
                '&:hover': { bgcolor: 'var(--store-primary-hover, ' + alpha(primaryColor, 0.9) + ')' },
              }}
            >
              Add
            </Button>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
