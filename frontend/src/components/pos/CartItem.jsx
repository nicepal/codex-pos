import { Box, Group, Text, ActionIcon, Button } from '@mantine/core';
import { Add, Remove, Delete, Block, Edit } from '@mui/icons-material';
import { CodexInput } from '../../design-system';

function kitchenLabel(status) {
  if (status === 'sent' || status === 'pending') return 'Sent to kitchen';
  if (status === 'accepted') return 'Accepted';
  if (status === 'preparing') return 'Preparing';
  if (status === 'ready') return 'Ready';
  if (status === 'served' || status === 'completed') return 'Served';
  return null;
}

export default function CartItem({
  item,
  index,
  formatMoney,
  moneyLabel,
  hasPosPro,
  onQtyChange,
  onRemove,
  onVoidLine,
  onPriceOverride,
  onLineDiscountChange,
}) {
  const voided = Boolean(item.voided);
  const lineTotal = voided ? 0 : item.unit_price * item.quantity - (item.line_discount || 0);
  const kitchenText = kitchenLabel(item.kitchen_status);

  return (
    <Box
      py="sm"
      px={4}
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        opacity: voided ? 0.55 : 1,
      }}
    >
      <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
        <Box style={{ minWidth: 0, flex: 1 }}>
          <Text
            size="sm"
            fw={600}
            lineClamp={1}
            title={item.product_name}
            td={voided ? 'line-through' : undefined}
          >
            {item.product_name}
            {voided ? ' (voided)' : ''}
          </Text>
          <Text size="xs" c="dimmed">
            {formatMoney(item.unit_price)}
            {item.sku ? ` · ${item.sku}` : ''}
            {item.serial_number ? ` · S/N ${item.serial_number}` : ''}
            {item.item_notes ? ` · ${item.item_notes}` : ''}
            {item.void_reason ? ` · ${item.void_reason}` : ''}
          </Text>
          {item.modifier_details?.length ? (
            <Text size="xs" c="dimmed">
              {item.modifier_details.map((m) => m.option_name).join(', ')}
            </Text>
          ) : null}
          {kitchenText && (
            <Text size="xs" c="teal" fw={600}>{kitchenText}</Text>
          )}
          {item.kitchen_sent && !item.kitchen_status && (
            <Text size="xs" c="teal" fw={600}>Will send to kitchen</Text>
          )}
        </Box>
        <Text size="sm" fw={700} style={{ whiteSpace: 'nowrap' }}>
          {formatMoney(lineTotal)}
        </Text>
      </Group>

      {!voided && (
        <Group justify="space-between" align="center" gap="xs" mt="xs" wrap="wrap">
          <Group gap={2} wrap="nowrap">
            <ActionIcon
              variant="subtle"
              size={44}
              onClick={() => onQtyChange(index, item.quantity - 1)}
              aria-label="Decrease quantity"
            >
              <Remove />
            </ActionIcon>
            <Text fw={700} ta="center" w={36} size="md">
              {item.quantity}
            </Text>
            <ActionIcon
              variant="subtle"
              size={44}
              onClick={() => onQtyChange(index, item.quantity + 1)}
              aria-label="Increase quantity"
            >
              <Add />
            </ActionIcon>
            {hasPosPro && onVoidLine && (
              <ActionIcon
                variant="subtle"
                color="yellow"
                size={44}
                onClick={() => onVoidLine(index)}
                aria-label="Void item"
              >
                <Block />
              </ActionIcon>
            )}
            <ActionIcon
              variant="subtle"
              color="red"
              size={44}
              onClick={() => onRemove(index)}
              aria-label="Remove item"
            >
              <Delete />
            </ActionIcon>
            {hasPosPro && onPriceOverride && (
              <Button
                size="compact-sm"
                variant="subtle"
                leftSection={<Edit sx={{ fontSize: 16 }} />}
                onClick={() => onPriceOverride(index)}
              >
                Price
              </Button>
            )}
          </Group>

          {hasPosPro && (
            <CodexInput
              type="number"
              label={moneyLabel ? moneyLabel('Disc') : 'Disc'}
              w={96}
              size="xs"
              value={item.line_discount || ''}
              onChange={(e) => onLineDiscountChange(index, parseFloat(e.target.value) || 0)}
              min={0}
              step={0.01}
              styles={{ input: { minHeight: 36 } }}
            />
          )}
        </Group>
      )}
    </Box>
  );
}
