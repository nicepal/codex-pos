const TICKET_STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled'];

const ORDER_ITEM_KITCHEN_STATUSES = [
  'not_sent', 'sent', 'accepted', 'preparing', 'ready', 'served', 'cancelled',
];

/** Map ticket/ticket-item status → order_items.kitchen_status */
function ticketStatusToOrderItemStatus(ticketStatus) {
  const map = {
    pending: 'sent',
    accepted: 'accepted',
    preparing: 'preparing',
    ready: 'ready',
    served: 'served',
    completed: 'served',
    cancelled: 'cancelled',
  };
  return map[ticketStatus] || null;
}

const KDS_SETTINGS_KEYS = [
  'kitchen_enabled',
  'default_station_id',
  'warning_after_minutes',
  'overdue_after_minutes',
  'sound_enabled',
  'auto_refresh_seconds',
];

const DEFAULT_KDS_SETTINGS = {
  kitchen_enabled: true,
  default_station_id: null,
  warning_after_minutes: 8,
  overdue_after_minutes: 15,
  sound_enabled: true,
  auto_refresh_seconds: 30,
};

function mergeKdsSettings(stored = {}) {
  const out = { ...DEFAULT_KDS_SETTINGS };
  if (stored && typeof stored === 'object') {
    for (const key of KDS_SETTINGS_KEYS) {
      if (stored[key] !== undefined) out[key] = stored[key];
    }
  }
  return out;
}

function isKitchenItem(productRow, categoryRow) {
  if (!productRow) return false;
  if (productRow.requires_kitchen) return true;
  if (productRow.kitchen_station_id) return true;
  if (categoryRow?.kitchen_station_id) return true;
  return false;
}

function resolveStationId(productRow, categoryRow, defaultStationId) {
  return productRow?.kitchen_station_id
    || categoryRow?.kitchen_station_id
    || defaultStationId
    || null;
}

function normalizeTicketStatus(status) {
  return status === 'completed' ? 'served' : status;
}

function deriveOrderKitchenStatus(ticketStatuses) {
  const normalized = (ticketStatuses || []).map(normalizeTicketStatus);
  const active = normalized.filter((s) => s !== 'cancelled' && s !== 'served');
  if (!active.length) {
    if (normalized.some((s) => s === 'served')) return 'served';
    return null;
  }
  if (active.every((s) => s === 'ready')) return 'ready';
  if (active.some((s) => s === 'preparing' || s === 'ready' || s === 'accepted')) return 'in_progress';
  return 'pending';
}

function canTransitionTicket(from, to) {
  const fromNorm = normalizeTicketStatus(from);
  const toNorm = normalizeTicketStatus(to);
  const map = {
    pending: ['accepted', 'preparing', 'cancelled'],
    accepted: ['preparing', 'cancelled', 'pending'],
    preparing: ['ready', 'cancelled', 'accepted', 'pending'],
    ready: ['served', 'completed', 'preparing', 'cancelled'],
    served: ['preparing'],
    completed: ['preparing'],
    cancelled: [],
  };
  return (map[fromNorm] || []).includes(toNorm);
}

module.exports = {
  TICKET_STATUSES,
  ORDER_ITEM_KITCHEN_STATUSES,
  KDS_SETTINGS_KEYS,
  DEFAULT_KDS_SETTINGS,
  mergeKdsSettings,
  isKitchenItem,
  resolveStationId,
  deriveOrderKitchenStatus,
  canTransitionTicket,
  normalizeTicketStatus,
  ticketStatusToOrderItemStatus,
};
