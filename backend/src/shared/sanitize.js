const DEFAULT_SORT_COLUMNS = new Set([
  'created_at', 'updated_at', 'name', 'status', 'email', 'sale_price', 'stock_quantity', 'sku',
]);

const PROTECTED_COLUMNS = new Set(['id', 'tenant_id', 'created_at', 'updated_at']);

function sanitizeSort(orderBy, order, allowedColumns) {
  const columns = allowedColumns || DEFAULT_SORT_COLUMNS;
  const safeOrderBy = columns.has(orderBy) ? orderBy : 'created_at';
  const dir = String(order || 'DESC').toUpperCase();
  const safeOrder = dir === 'ASC' ? 'ASC' : 'DESC';
  return { orderBy: safeOrderBy, order: safeOrder };
}

function stripProtectedFields(data, extraProtected = []) {
  const blocked = new Set([...PROTECTED_COLUMNS, ...extraProtected]);
  const out = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (blocked.has(key)) continue;
    if (!/^[a-z_][a-z0-9_]*$/i.test(key)) continue;
    out[key] = value;
  }
  return out;
}

function pickAllowedFields(data, allowedColumns) {
  const allowed = new Set(allowedColumns);
  const out = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (allowed.has(key) && value !== undefined) out[key] = value;
  }
  return out;
}

module.exports = { sanitizeSort, stripProtectedFields, pickAllowedFields, DEFAULT_SORT_COLUMNS, PROTECTED_COLUMNS };
