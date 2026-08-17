const TABLE_STATUSES = ['available', 'occupied', 'reserved', 'cleaning'];
const TABLE_SHAPES = ['square', 'round', 'rectangle'];
const SESSION_STATUSES = ['open', 'closed'];

const DEFAULT_RESTAURANT_SETTINGS = {
  default_guest_count: 2,
  show_capacity_on_floor_plan: true,
  post_close_table_status: 'available',
  enable_reservations: false,
  default_floor_id: null,
  kitchen_enabled: true,
  default_station_id: null,
  warning_after_minutes: 8,
  overdue_after_minutes: 15,
  sound_enabled: true,
  auto_refresh_seconds: 30,
};

function mergeRestaurantSettings(stored = {}) {
  const out = { ...DEFAULT_RESTAURANT_SETTINGS };
  if (stored && typeof stored === 'object') {
    for (const key of Object.keys(DEFAULT_RESTAURANT_SETTINGS)) {
      if (stored[key] !== undefined) out[key] = stored[key];
    }
    if (stored.default_floor_id !== undefined) out.default_floor_id = stored.default_floor_id;
    if (stored.default_station_id !== undefined) out.default_station_id = stored.default_station_id;
  }
  return out;
}

function canOpenTable(tableStatus, hasActiveSession) {
  if (hasActiveSession) {
    return { ok: false, reason: 'Table already has an active session' };
  }
  if (tableStatus === 'occupied') {
    return { ok: false, reason: 'Table is already occupied' };
  }
  if (tableStatus === 'reserved') {
    return { ok: false, reason: 'Table is reserved' };
  }
  return { ok: true };
}

function canCloseSession(session) {
  if (!session) {
    return { ok: false, reason: 'Session not found' };
  }
  if (session.status !== 'open') {
    return { ok: false, reason: 'Session is not open' };
  }
  return { ok: true };
}

function resolvePostCloseTableStatus(settings = {}) {
  const status = settings.post_close_table_status;
  return status === 'cleaning' ? 'cleaning' : 'available';
}

module.exports = {
  TABLE_STATUSES,
  TABLE_SHAPES,
  SESSION_STATUSES,
  DEFAULT_RESTAURANT_SETTINGS,
  mergeRestaurantSettings,
  canOpenTable,
  canCloseSession,
  resolvePostCloseTableStatus,
};
