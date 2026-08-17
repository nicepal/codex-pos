import { SimpleGrid } from '@mantine/core';
import { Pause, CreditCard, Payments, CallSplit, CardGiftcard, Stars } from '@mui/icons-material';
import { CodexPaymentButton } from '../../design-system';

export default function PaymentButtons({
  disabled,
  checkoutPending,
  holdPending,
  hasPosPro,
  onCash,
  onCard,
  onSplit,
  onHold,
  onGiftCard,
  onLoyalty,
  showGiftCard = true,
  showLoyalty = false,
}) {
  return (
    <SimpleGrid cols={2} spacing="xs">
      <CodexPaymentButton
        color="teal"
        disabled={disabled || checkoutPending}
        onClick={onCash}
        leftSection={<Payments fontSize="small" />}
      >
        Cash
      </CodexPaymentButton>
      <CodexPaymentButton
        color="codex"
        disabled={disabled || checkoutPending}
        onClick={onCard}
        leftSection={<CreditCard fontSize="small" />}
      >
        Card
      </CodexPaymentButton>
      <CodexPaymentButton
        variant="outline"
        color="gray"
        disabled={disabled}
        onClick={onSplit}
        leftSection={<CallSplit fontSize="small" />}
        style={{ gridColumn: (showGiftCard || showLoyalty || hasPosPro) ? undefined : '1 / -1' }}
      >
        Split
      </CodexPaymentButton>
      {showGiftCard && (
        <CodexPaymentButton
          variant="outline"
          color="violet"
          disabled={disabled || checkoutPending}
          onClick={onGiftCard}
          leftSection={<CardGiftcard fontSize="small" />}
        >
          Gift card
        </CodexPaymentButton>
      )}
      {showLoyalty && (
        <CodexPaymentButton
          variant="outline"
          color="yellow"
          disabled={disabled || checkoutPending}
          onClick={onLoyalty}
          leftSection={<Stars fontSize="small" />}
        >
          Loyalty
        </CodexPaymentButton>
      )}
      {hasPosPro && (
        <CodexPaymentButton
          variant="outline"
          color="violet"
          disabled={disabled || holdPending}
          onClick={onHold}
          leftSection={<Pause fontSize="small" />}
        >
          Hold
        </CodexPaymentButton>
      )}
    </SimpleGrid>
  );
}
