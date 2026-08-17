import { Box, Group, Text, Button, Badge, SegmentedControl } from '@mantine/core';
import { TableRestaurant, TakeoutDining, Person, Edit } from '@mui/icons-material';

export default function RestaurantContextBar({
  restaurant,
  onOrderTypeChange,
  onChangeTable,
  onClearTable,
  formatGuestLabel,
  modeSelector,
}) {
  if (restaurant?.posMode !== 'restaurant') return null;

  const isDineIn = restaurant.orderType === 'dine_in';
  const hasTable = Boolean(restaurant.tableId);

  return (
    <Box
      px={{ base: 'xs', sm: 'md' }}
      py="xs"
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        background: 'var(--mantine-color-gray-0)',
        flexShrink: 0,
      }}
    >
      <Group gap="sm" wrap="wrap" align="center">
        {modeSelector ? (
          <Box hiddenFrom="md" w="100%">{modeSelector}</Box>
        ) : null}

        <SegmentedControl
          size="xs"
          value={restaurant.orderType || 'dine_in'}
          onChange={(v) => onOrderTypeChange?.(v)}
          data={[
            {
              value: 'dine_in',
              label: (
                <Group gap={4} wrap="nowrap" justify="center">
                  <TableRestaurant sx={{ fontSize: 16 }} />
                  <span>Dine-in</span>
                </Group>
              ),
            },
            {
              value: 'takeaway',
              label: (
                <Group gap={4} wrap="nowrap" justify="center">
                  <TakeoutDining sx={{ fontSize: 16 }} />
                  <span>Takeaway</span>
                </Group>
              ),
            },
          ]}
          styles={{ label: { minHeight: 30, paddingInline: 10 } }}
        />

        {isDineIn && (
          <>
            {hasTable ? (
              <>
                <Badge
                  variant="outline"
                  color="codex"
                  leftSection={<TableRestaurant sx={{ fontSize: 14 }} />}
                  styles={{ root: { textTransform: 'none' } }}
                >
                  {`${restaurant.floorName ? `${restaurant.floorName} · ` : ''}${restaurant.tableName || 'Table'}`}
                </Badge>
                {restaurant.guestCount ? (
                  <Text size="xs" c="dimmed">
                    {formatGuestLabel
                      ? formatGuestLabel(restaurant.guestCount)
                      : `${restaurant.guestCount} guests`}
                  </Text>
                ) : null}
                {restaurant.serverName ? (
                  <Badge
                    variant="outline"
                    color="gray"
                    leftSection={<Person sx={{ fontSize: 14 }} />}
                    styles={{ root: { textTransform: 'none' } }}
                  >
                    {restaurant.serverName}
                  </Badge>
                ) : null}
                {restaurant.existingOrderId ? (
                  <Badge variant="outline" color="yellow" styles={{ root: { textTransform: 'none' } }}>
                    Open order loaded
                  </Badge>
                ) : null}
                <Button
                  size="compact-sm"
                  variant="subtle"
                  leftSection={<Edit sx={{ fontSize: 16 }} />}
                  onClick={onChangeTable}
                >
                  Change table
                </Button>
                <Button size="compact-sm" variant="subtle" color="gray" onClick={onClearTable}>
                  Clear
                </Button>
              </>
            ) : (
              <Button
                size="compact-sm"
                leftSection={<TableRestaurant sx={{ fontSize: 16 }} />}
                onClick={onChangeTable}
              >
                Select table
              </Button>
            )}
          </>
        )}
      </Group>
    </Box>
  );
}
