import { Group, SegmentedControl, Text } from '@mantine/core';
import { Storefront, Restaurant } from '@mui/icons-material';

export default function RestaurantModeSelector({ posMode, onPosModeChange, disabled }) {
  return (
    <Group gap="xs" wrap="wrap">
      <Text size="xs" c="dimmed" visibleFrom="sm">
        Mode
      </Text>
      <SegmentedControl
        size="sm"
        value={posMode || 'retail'}
        onChange={(v) => onPosModeChange?.(v)}
        disabled={disabled}
        data={[
          {
            value: 'retail',
            label: (
              <Group gap={4} justify="center" wrap="nowrap">
                <Storefront sx={{ fontSize: 16 }} />
                <span>Retail</span>
              </Group>
            ),
          },
          {
            value: 'restaurant',
            label: (
              <Group gap={4} justify="center" wrap="nowrap">
                <Restaurant sx={{ fontSize: 16 }} />
                <span>Restaurant</span>
              </Group>
            ),
          },
        ]}
        styles={{
          root: { minHeight: 36 },
          label: { paddingLeft: 10, paddingRight: 10, minHeight: 32 },
        }}
      />
    </Group>
  );
}
