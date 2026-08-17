import { Box, ButtonBase, alpha } from '@mui/material';
import { LocalShippingOutlined, StoreOutlined } from '@mui/icons-material';
import { SF } from './storefrontTheme';

/**
 * Compact delivery/pickup segmented control — hidden when only one option exists.
 */
export default function FulfillmentSegment({
  value = 'delivery',
  onChange,
  hasDelivery = true,
  hasPickup = false,
  primaryColor,
  size = 'medium', // 'medium' | 'small'
}) {
  const showDelivery = hasDelivery;
  const showPickup = hasPickup;
  if (!showDelivery || !showPickup) return null;

  const options = [
    showDelivery && { key: 'delivery', label: 'Delivery', icon: LocalShippingOutlined },
    showPickup && { key: 'pickup', label: 'Pickup', icon: StoreOutlined },
  ].filter(Boolean);

  const compact = size === 'small';

  return (
    <Box
      role="group"
      aria-label="Order fulfillment"
      sx={{
        display: 'inline-flex',
        p: 0.35,
        borderRadius: `${SF.radius.sm}px`,
        bgcolor: SF.colors.paperMuted,
        border: '1px solid',
        borderColor: SF.colors.border,
        flexShrink: 0,
      }}
    >
      {options.map(({ key, label, icon: Icon }) => {
        const active = value === key;
        return (
          <ButtonBase
            key={key}
            aria-pressed={active}
            onClick={() => onChange?.(key)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: compact ? 1 : 1.35,
              py: compact ? 0.45 : 0.55,
              minHeight: compact ? 30 : 34,
              borderRadius: `${SF.radius.sm - 2}px`,
              fontSize: compact ? 12 : 12.5,
              fontWeight: active ? 700 : 550,
              color: active ? '#fff' : SF.colors.textMuted,
              bgcolor: active ? primaryColor : 'transparent',
              transition: 'background-color 0.15s ease, color 0.15s ease',
              '&:hover': {
                bgcolor: active ? primaryColor : alpha(primaryColor, 0.08),
                color: active ? '#fff' : SF.colors.text,
              },
            }}
          >
            <Icon sx={{ fontSize: compact ? 14 : 15 }} />
            {label}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
