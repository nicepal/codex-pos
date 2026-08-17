import { useState } from 'react';
import { Box, Typography, Stack, Chip, alpha } from '@mui/material';
import {
  StorefrontOutlined, LocalShippingOutlined, StoreOutlined, FiberManualRecord,
} from '@mui/icons-material';
import { resolveProductImageSrc } from '../../utils/imageUrl';
import { customerFacingDescription } from '../../utils/storefrontContent';
import FulfillmentSegment from './FulfillmentSegment';
import { SF } from './storefrontTheme';

/**
 * Compact merchant header — logo, name, optional blurb, fulfillment, open status.
 * Only surfaces real backend fields; never invents data.
 */
export default function StoreHero({
  storeName,
  logoUrl,
  description,
  tagline,
  primaryColor,
  phone,
  address,
  businessTypeLabel,
  isOpen,
  hasPickup,
  hasDelivery,
  fulfillmentType,
  onFulfillmentChange,
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const resolvedLogo = logoUrl && !logoFailed ? resolveProductImageSrc(logoUrl) : null;
  const initial = (storeName || 'S').trim().charAt(0).toUpperCase();
  const blurb = customerFacingDescription(
    [tagline, description].filter(Boolean).join(' · ') || null,
  );
  const shortBlurb = blurb && blurb.length > 140 ? `${blurb.slice(0, 137)}…` : blurb;
  const meta = [address, phone].filter(Boolean).join(' · ');
  const showFulfillmentToggle = hasDelivery && hasPickup;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        p: { xs: 1.5, md: 1.75 },
        mb: 1,
        mt: { xs: 1, md: 1.25 },
        bgcolor: SF.colors.paper,
        border: '1px solid',
        borderColor: 'var(--store-border, ' + SF.colors.border + ')',
        borderRadius: `${SF.radius.lg}px`,
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
      }}
    >
      <Box
        sx={{
          width: { xs: 52, md: 56 },
          height: { xs: 52, md: 56 },
          borderRadius: `${SF.radius.md}px`,
          bgcolor: SF.colors.paperMuted,
          border: '1px solid',
          borderColor: SF.colors.border,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {resolvedLogo ? (
          <Box
            component="img"
            src={resolvedLogo}
            alt={`${storeName || 'Store'} logo`}
            onError={() => setLogoFailed(true)}
            sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 0.5 }}
          />
        ) : (
          <Typography fontWeight={800} sx={{ fontSize: 20, color: primaryColor }}>
            {initial}
          </Typography>
        )}
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap sx={{ gap: 0.75 }}>
          <Typography
            component="h1"
            fontWeight={750}
            sx={{ fontSize: { xs: 18, md: 22 }, letterSpacing: '-0.025em', lineHeight: 1.2 }}
          >
            {storeName}
          </Typography>
          {businessTypeLabel && (
            <Chip
              label={businessTypeLabel}
              size="small"
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 600,
                bgcolor: SF.colors.paperMuted,
                border: 'none',
              }}
            />
          )}
          {typeof isOpen === 'boolean' && (
            <Chip
              icon={<FiberManualRecord sx={{ fontSize: '8px !important', color: isOpen ? '#059669 !important' : '#9ca3af !important' }} />}
              label={isOpen ? 'Open now' : 'Closed'}
              size="small"
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 600,
                bgcolor: isOpen ? alpha('#059669', 0.08) : SF.colors.paperMuted,
                color: isOpen ? '#059669' : SF.colors.textMuted,
                border: 'none',
                '& .MuiChip-icon': { ml: 0.75 },
              }}
            />
          )}
        </Stack>

        {(shortBlurb || meta) && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.35,
              fontSize: 13,
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {shortBlurb || meta}
          </Typography>
        )}

        {(hasDelivery || hasPickup) && (
          <Stack direction="row" flexWrap="wrap" alignItems="center" useFlexGap sx={{ mt: 1, gap: 0.65 }}>
            {showFulfillmentToggle ? (
              <FulfillmentSegment
                value={fulfillmentType}
                onChange={onFulfillmentChange}
                hasDelivery={hasDelivery}
                hasPickup={hasPickup}
                primaryColor={primaryColor}
                size="small"
              />
            ) : (
              <>
                {hasDelivery && (
                  <Chip
                    icon={<LocalShippingOutlined sx={{ fontSize: '14px !important' }} />}
                    label="Delivery"
                    size="small"
                    sx={{
                      height: 26,
                      fontSize: 12,
                      fontWeight: 600,
                      bgcolor: alpha(primaryColor, 0.08),
                      color: primaryColor,
                      border: 'none',
                      borderRadius: `${SF.radius.sm}px`,
                      '& .MuiChip-icon': { color: primaryColor },
                    }}
                  />
                )}
                {hasPickup && (
                  <Chip
                    icon={<StoreOutlined sx={{ fontSize: '14px !important' }} />}
                    label="Pickup"
                    size="small"
                    sx={{
                      height: 26,
                      fontSize: 12,
                      fontWeight: 600,
                      bgcolor: SF.colors.paperMuted,
                      border: 'none',
                      borderRadius: `${SF.radius.sm}px`,
                    }}
                  />
                )}
              </>
            )}
          </Stack>
        )}
      </Box>

      {!resolvedLogo && !storeName && (
        <StorefrontOutlined sx={{ color: SF.colors.textFaint, alignSelf: 'center' }} />
      )}
    </Box>
  );
}
