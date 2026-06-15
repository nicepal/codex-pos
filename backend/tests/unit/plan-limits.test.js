const { checkLimit } = require('../../src/shared/plan-limits');

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

const db = require('../../src/config/database');

describe('plan-limits', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows create when under product limit', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ product_limit: 100 }] })
      .mockResolvedValueOnce({ rows: [{ c: 50 }] });

    await expect(checkLimit('tenant-1', 'products')).resolves.not.toThrow();
  });

  it('throws when product limit reached', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ product_limit: 10 }] })
      .mockResolvedValueOnce({ rows: [{ c: 10 }] });

    await expect(checkLimit('tenant-1', 'products')).rejects.toThrow(/limit/i);
  });

  it('treats -1 as unlimited', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ product_limit: -1 }] })
      .mockResolvedValueOnce({ rows: [{ c: 9999 }] });

    await expect(checkLimit('tenant-1', 'products')).resolves.not.toThrow();
  });
});
