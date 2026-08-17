import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Stack, Chip, IconButton, Divider, alpha, Skeleton,
} from '@mui/material';
import { Close, Add, Check } from '@mui/icons-material';
import { addToCart } from '../../features/storefront/cartSlice';
import ProductImage from './ProductImage';
import QuantitySelector from './QuantitySelector';
import useStoreCurrency from '../../hooks/useStoreCurrency';
import { useStorefrontUI } from '../../contexts/StorefrontUIContext';
import { resolveProductImageSrc } from '../../utils/imageUrl';
import { customerFacingDescription } from '../../utils/storefrontContent';
import { SF } from './storefrontTheme';

/**
 * Shared product detail for drawer (desktop) and full product page.
 * Variants only when backend returns them.
 */
export default function ProductDetails({
  product,
  loading = false,
  error = null,
  onRetry,
  onClose,
  primaryColor,
  showStock = true,
  basePath,
  embedded = false,
  layout = 'drawer', // 'drawer' | 'page'
}) {
  const { formatMoney } = useStoreCurrency();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const ui = useStorefrontUI();
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [justAdded, setJustAdded] = useState(false);

  const variants = useMemo(
    () => (Array.isArray(product?.variants) ? product.variants.filter(Boolean) : []),
    [product],
  );

  useEffect(() => {
    setQty(1);
    setActiveImage(0);
    setJustAdded(false);
    setSelectedVariantId(variants[0]?.id || null);
  }, [product?.id, variants]);

  if (loading) {
    return (
      <Box sx={{ p: layout === 'page' ? 0 : 2 }}>
        <Skeleton variant="rectangular" sx={{ aspectRatio: SF.imageRatio, borderRadius: `${SF.radius.md}px` }} />
        <Skeleton width="70%" height={32} sx={{ mt: 2 }} />
        <Skeleton width="40%" sx={{ mt: 1 }} />
        <Skeleton height={80} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {error || 'Product not found'}
        </Typography>
        {onRetry && (
          <Button variant="contained" onClick={onRetry}>Try again</Button>
        )}
        {onClose && (
          <Button sx={{ ml: 1 }} onClick={onClose}>Close</Button>
        )}
      </Box>
    );
  }

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const price = parseFloat(selectedVariant?.sale_price ?? product.sale_price);
  const compareAt = parseFloat(
    selectedVariant?.compare_at_price ?? product.compare_at_price ?? 0,
  );
  const hasDiscount = compareAt > price && price > 0;
  const stock = selectedVariant
    ? Number(selectedVariant.stock_quantity ?? 0)
    : Number(product.stock_quantity ?? 0);
  const inStock = stock > 0;
  const images = product.images?.length
    ? product.images
    : (product.image_url ? [{ url: product.image_url }] : []);
  const description = customerFacingDescription(product.description);
  const lineTotal = price * qty;
  const isPage = layout === 'page' || embedded;

  const cartPayload = () => ({
    product_id: product.id,
    variant_id: selectedVariant?.id || undefined,
    variant_name: selectedVariant?.name || undefined,
    name: selectedVariant ? `${product.name} — ${selectedVariant.name}` : product.name,
    slug: product.slug,
    sale_price: price,
    category_name: product.category_name,
    image_url: images[0]?.url || product.image_url,
    sku: selectedVariant?.sku || product.sku,
    quantity: qty,
  });

  const handleAdd = () => {
    if (!inStock) return;
    if (variants.length && !selectedVariant) return;
    dispatch(addToCart(cartPayload()));
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  const handleBuyNow = () => {
    if (!inStock) return;
    if (variants.length && !selectedVariant) return;
    dispatch(addToCart(cartPayload()));
    onClose?.();
    navigate(`${basePath}/checkout`);
  };

  const gallery = (
    <Box>
      <Box
        sx={{
          position: 'relative',
          borderRadius: `${SF.radius.md}px`,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: SF.colors.border,
          bgcolor: SF.colors.paper,
        }}
      >
        {images[activeImage]?.url ? (
          <Box
            component="img"
            src={resolveProductImageSrc({ image_url: images[activeImage].url })}
            alt={product.name}
            sx={{
              width: '100%',
              aspectRatio: isPage ? '1 / 1' : SF.imageRatio,
              objectFit: 'cover',
              display: 'block',
              bgcolor: SF.colors.paperMuted,
            }}
          />
        ) : (
          <ProductImage
            src={null}
            alt={product.name}
            ratio={isPage ? '1 / 1' : SF.imageRatio}
          />
        )}
        {hasDiscount && (
          <Chip
            label="Sale"
            size="small"
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              height: 24,
              fontWeight: 700,
              bgcolor: alpha(primaryColor, 0.12),
              color: primaryColor,
            }}
          />
        )}
      </Box>

      {images.length > 1 && (
        <Stack direction="row" spacing={1} sx={{ mt: 1.25, overflowX: 'auto', pb: 0.25 }}>
          {images.map((img, i) => (
            <Box
              key={i}
              component="button"
              type="button"
              aria-label={`View image ${i + 1}`}
              onClick={() => setActiveImage(i)}
              sx={{
                width: 64,
                height: 64,
                p: 0,
                borderRadius: `${SF.radius.sm}px`,
                overflow: 'hidden',
                cursor: 'pointer',
                flexShrink: 0,
                border: '2px solid',
                borderColor: activeImage === i ? primaryColor : SF.colors.border,
                bgcolor: SF.colors.paperMuted,
              }}
            >
              <Box
                component="img"
                src={resolveProductImageSrc({ image_url: img.url })}
                alt=""
                loading="lazy"
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );

  const info = (
    <Stack spacing={1.5}>
      {product.category_name && (
        <Chip
          label={product.category_name}
          size="small"
          sx={{
            alignSelf: 'flex-start',
            height: 26,
            fontWeight: 600,
            bgcolor: SF.colors.paperMuted,
            borderRadius: `${SF.radius.sm}px`,
          }}
        />
      )}

      {(isPage || embedded) && (
        <Typography
          component="h1"
          fontWeight={750}
          sx={{ fontSize: { xs: 22, md: 28 }, letterSpacing: '-0.03em', lineHeight: 1.2 }}
        >
          {product.name}
        </Typography>
      )}

      <Stack direction="row" alignItems="baseline" spacing={1} flexWrap="wrap" useFlexGap>
        <Typography fontWeight={800} sx={{ fontSize: { xs: 22, md: 26 }, letterSpacing: '-0.03em' }}>
          {formatMoney(price)}
        </Typography>
        {hasDiscount && (
          <Typography color="text.disabled" sx={{ textDecoration: 'line-through', fontSize: 15 }}>
            {formatMoney(compareAt)}
          </Typography>
        )}
      </Stack>

      {showStock && (
        <Typography
          variant="body2"
          fontWeight={650}
          sx={{ color: inStock ? 'success.main' : 'error.main' }}
        >
          {inStock ? (stock <= 10 ? `Only ${stock} left` : 'In stock') : 'Out of stock'}
        </Typography>
      )}

      {description && (
        <Typography color="text.secondary" sx={{ fontSize: 14.5, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
          {description}
        </Typography>
      )}

      {variants.length > 0 && (
        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Choose an option
          </Typography>
          <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 0.75 }}>
            {variants.map((v) => {
              const active = v.id === selectedVariantId;
              const vOut = Number(v.stock_quantity) <= 0;
              return (
                <Chip
                  key={v.id}
                  label={v.name}
                  clickable={!vOut}
                  disabled={vOut}
                  onClick={() => setSelectedVariantId(v.id)}
                  sx={{
                    height: 34,
                    fontWeight: active ? 700 : 550,
                    borderRadius: `${SF.radius.sm}px`,
                    bgcolor: active ? primaryColor : SF.colors.paper,
                    color: active ? '#fff' : 'text.primary',
                    border: '1px solid',
                    borderColor: active ? primaryColor : SF.colors.border,
                  }}
                />
              );
            })}
          </Stack>
        </Box>
      )}
    </Stack>
  );

  const actions = (
    <Box>
      {inStock ? (
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <QuantitySelector
              value={qty}
              onChange={setQty}
              max={Math.max(1, stock)}
              primaryColor={primaryColor}
            />
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={justAdded ? <Check /> : <Add />}
              onClick={handleAdd}
              sx={{
                py: 1.35,
                fontWeight: 750,
                borderRadius: `${SF.radius.sm}px`,
                bgcolor: justAdded ? 'success.main' : primaryColor,
                '&:hover': { bgcolor: justAdded ? 'success.dark' : alpha(primaryColor, 0.9) },
              }}
            >
              {justAdded ? 'Added' : `Add · ${formatMoney(lineTotal)}`}
            </Button>
          </Stack>

          {justAdded && ui?.openCart && (
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                onClose?.();
                ui.openCart();
              }}
              sx={{
                fontWeight: 650,
                borderColor: SF.colors.border,
                color: 'text.primary',
              }}
            >
              View cart
            </Button>
          )}

          {isPage && (
            <Button
              fullWidth
              variant="text"
              onClick={handleBuyNow}
              sx={{ color: 'text.secondary', fontWeight: 600 }}
            >
              Buy now
            </Button>
          )}
        </Stack>
      ) : (
        <Button fullWidth disabled variant="outlined" size="large" sx={{ py: 1.35 }}>
          Currently unavailable
        </Button>
      )}
    </Box>
  );

  if (isPage) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.05fr) minmax(0, 1fr)' },
          gap: { xs: 2, md: 4 },
          alignItems: 'start',
        }}
      >
        {gallery}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
            position: { md: 'sticky' },
            top: { md: 88 },
          }}
        >
          {info}
          <Divider sx={{ borderColor: SF.colors.borderSubtle }} />
          {actions}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
        <Typography fontWeight={700} noWrap sx={{ pr: 2, fontSize: 15 }}>
          {product.name}
        </Typography>
        {onClose && (
          <IconButton aria-label="Close" onClick={onClose} size="small">
            <Close />
          </IconButton>
        )}
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
        {gallery}
        <Box sx={{ mt: 2 }}>{info}</Box>
      </Box>

      <Box
        sx={{
          px: 2,
          py: 2,
          borderTop: '1px solid',
          borderColor: SF.colors.border,
          bgcolor: SF.colors.paper,
        }}
      >
        {actions}
      </Box>
    </Box>
  );
}
