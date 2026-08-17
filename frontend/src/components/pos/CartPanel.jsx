import { Box, Text, Button, ScrollArea } from '@mantine/core';
import { RestaurantMenu } from '@mui/icons-material';
import EmptyState from '../EmptyState';
import CartItem from './CartItem';
import CustomerSelector from './CustomerSelector';
import PaymentSummary from './PaymentSummary';
import PaymentButtons from './PaymentButtons';
import { CodexSelect } from '../../design-system';

export default function CartPanel({
  items,
  discount,
  taxRate,
  subtotal,
  taxAmount,
  tipAmount = 0,
  grandTotal,
  onDiscountChange,
  onTipChange,
  showTip = false,
  onLineDiscountChange,
  onQtyChange,
  onRemove,
  onVoidLine,
  onPriceOverride,
  onCash,
  onCard,
  onSplitOpen,
  onHold,
  onGiftCard,
  onLoyalty,
  showGiftCard = true,
  showLoyalty = false,
  checkoutPending,
  holdPending,
  customer,
  onCustomerChange,
  customers,
  customerInputRef,
  branchId,
  onBranchChange,
  branches,
  formatMoney,
  currency,
  hasPosPro,
  moneyLabel,
  couponCode,
  onCouponChange,
  showCoupon,
  compact = false,
  showSendToKitchen = false,
  kitchenSent = false,
  onSendToKitchen,
  sendKitchenPending = false,
}) {
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const active = items.filter((i) => !i.voided);
  const sent = active.filter((i) => i.kitchen_status && i.kitchen_status !== 'not_sent');
  const unsent = active.filter((i) => !i.kitchen_status || i.kitchen_status === 'not_sent');

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: compact ? 'auto' : '100%',
        minHeight: 0,
      }}
    >
      <Text fw={700} mb="xs" px={4}>
        Current sale {itemCount > 0 ? `· ${itemCount}` : ''}
      </Text>

      <CodexSelect
        native
        label="Branch"
        mb="xs"
        value={branchId || ''}
        onChange={(e) => onBranchChange(e.currentTarget.value)}
        data={[
          { value: '', label: 'Default' },
          ...(branches || []).map((b) => ({ value: b.id, label: b.name })),
        ]}
      />

      <Box mb="xs">
        <CustomerSelector
          ref={customerInputRef}
          customer={customer}
          customers={customers}
          onChange={onCustomerChange}
        />
      </Box>

      <ScrollArea
        style={{
          flex: 1,
          minHeight: compact ? 160 : 0,
          maxHeight: compact ? 280 : undefined,
        }}
        mb="xs"
        type="auto"
        offsetScrollbars
      >
        {!items.length ? (
          <EmptyState
            compact
            illustration="cart"
            title="Cart is empty"
            message="Scan a barcode or tap a product"
          />
        ) : (
          items.map((item, idx) => (
            <CartItem
              key={`${item.product_id}-${item.variant_id || ''}-${item.serial_number || ''}-${idx}`}
              item={item}
              index={idx}
              formatMoney={formatMoney}
              moneyLabel={moneyLabel}
              hasPosPro={hasPosPro}
              onQtyChange={onQtyChange}
              onRemove={onRemove}
              onVoidLine={onVoidLine}
              onPriceOverride={onPriceOverride}
              onLineDiscountChange={onLineDiscountChange}
            />
          ))
        )}
      </ScrollArea>

      <Box
        style={{
          marginTop: 'auto',
          paddingTop: 8,
          borderTop: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <PaymentSummary
          subtotal={subtotal}
          discount={discount}
          taxRate={taxRate}
          taxAmount={taxAmount}
          tipAmount={tipAmount}
          grandTotal={grandTotal}
          currency={currency}
          formatMoney={formatMoney}
          onDiscountChange={onDiscountChange}
          onTipChange={onTipChange}
          showTip={showTip}
          couponCode={couponCode}
          onCouponChange={onCouponChange}
          showCoupon={showCoupon}
        />
        {showSendToKitchen && (
          <>
            {(sent.length > 0 || unsent.length > 0) && (
              <Text size="xs" c="dimmed" mb={4} px={4}>
                {sent.length > 0 ? `${sent.length} sent` : ''}
                {sent.length > 0 && unsent.length > 0 ? ', ' : ''}
                {unsent.length > 0 ? `${unsent.length} not sent` : ''}
              </Text>
            )}
            <Button
              fullWidth
              variant="outline"
              color={kitchenSent ? 'teal' : 'codex'}
              leftSection={<RestaurantMenu fontSize="small" />}
              onClick={onSendToKitchen}
              disabled={!items.length || sendKitchenPending}
              mb="xs"
              styles={{ root: { minHeight: 44 } }}
            >
              {sendKitchenPending
                ? 'Sending…'
                : kitchenSent
                  ? 'Sent to kitchen'
                  : 'Send to kitchen'}
            </Button>
          </>
        )}
        <PaymentButtons
          disabled={!items.length}
          checkoutPending={checkoutPending}
          holdPending={holdPending}
          hasPosPro={hasPosPro}
          onCash={onCash}
          onCard={onCard}
          onSplit={onSplitOpen}
          onHold={onHold}
          onGiftCard={onGiftCard}
          onLoyalty={onLoyalty}
          showGiftCard={showGiftCard}
          showLoyalty={showLoyalty}
        />
      </Box>
    </Box>
  );
}
