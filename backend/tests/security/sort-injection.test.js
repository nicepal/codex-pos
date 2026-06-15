const { createApp } = require('../../src/app');
const { sanitizeSort } = require('../../src/shared/sanitize');

describe('security — app bootstrap', () => {
  it('creates express app without throwing', () => {
    expect(() => createApp()).not.toThrow();
  });
});

describe('sanitizeSort', () => {
  it('rejects SQL injection in orderBy', () => {
    const { orderBy } = sanitizeSort('id; DROP TABLE tenants;--', 'DESC');
    expect(orderBy).toBe('created_at');
  });

  it('rejects invalid sort order', () => {
    const { order } = sanitizeSort('name', 'INVALID');
    expect(order).toBe('DESC');
  });

  it('allows whitelisted columns', () => {
    const allowed = new Set(['name', 'created_at']);
    const { orderBy, order } = sanitizeSort('name', 'ASC', allowed);
    expect(orderBy).toBe('name');
    expect(order).toBe('ASC');
  });

  it('falls back to defaults when allowedColumns is null', () => {
    const { orderBy } = sanitizeSort('created_at', 'DESC', null);
    expect(orderBy).toBe('created_at');
  });
});
