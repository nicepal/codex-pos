const { ValidationError } = require('./errors');

function parseBulkIds(body, { max = 100 } = {}) {
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError('ids array is required');
  }
  if (ids.length > max) {
    throw new ValidationError(`Cannot delete more than ${max} items at once`);
  }
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) {
    throw new ValidationError('ids array is required');
  }
  return unique;
}

async function bulkRemoveByIds(removeFn, tenantId, ids) {
  let deleted = 0;
  const errors = [];

  for (const id of ids) {
    try {
      await removeFn(tenantId, id);
      deleted += 1;
    } catch (err) {
      errors.push({ id, message: err.message || 'Delete failed' });
    }
  }

  return { deleted, failed: errors.length, errors };
}

module.exports = { parseBulkIds, bulkRemoveByIds };
