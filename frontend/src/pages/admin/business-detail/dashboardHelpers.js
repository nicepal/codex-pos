import { formatMoney } from '../../../utils/currency';
import { formatDisplayText } from '../../../utils/displayText';

export function makeMoneyFormatter(currency) {
  return (amount) => formatMoney(amount, currency);
}

export function formatGrowth(growthPercent) {
  if (growthPercent == null || Number.isNaN(growthPercent)) return null;
  const sign = growthPercent >= 0 ? '↑' : '↓';
  return `${sign} ${Math.abs(growthPercent)}%`;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function statusChipColor(status) {
  const map = {
    active: 'success',
    trial: 'info',
    suspended: 'error',
    expired: 'warning',
    paid: 'success',
    completed: 'success',
    pending: 'warning',
    cancelled: 'default',
    refunded: 'error',
    on_hold: 'warning',
    trialing: 'info',
    past_due: 'warning',
  };
  return map[status] || 'default';
}

export function formatStatus(status) {
  return formatDisplayText(status || 'unknown');
}

export function usageLabel(used, limit) {
  if (limit == null) return `${used} / Unlimited`;
  return `${used} / ${limit}`;
}
