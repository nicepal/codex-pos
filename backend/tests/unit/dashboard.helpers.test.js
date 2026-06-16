const {
  computeChangePercent,
  buildKpi,
  resolveRange,
  buildFinancialPeriod,
  groupNotifications,
} = require('../../src/modules/reports/dashboard.helpers');

describe('dashboard.helpers', () => {
  describe('computeChangePercent', () => {
    test('returns 0 when both values are 0', () => {
      expect(computeChangePercent(0, 0)).toBe(0);
    });

    test('returns 100 when previous is 0 and current is positive', () => {
      expect(computeChangePercent(100, 0)).toBe(100);
    });

    test('calculates positive growth', () => {
      expect(computeChangePercent(120, 100)).toBe(20);
    });

    test('calculates negative growth', () => {
      expect(computeChangePercent(80, 100)).toBe(-20);
    });

    test('rounds to one decimal place', () => {
      expect(computeChangePercent(133, 100)).toBe(33);
      expect(computeChangePercent(1, 3)).toBe(-66.7);
    });
  });

  describe('buildKpi', () => {
    test('sets trend up for positive change', () => {
      const kpi = buildKpi(150, 100, 'vs Yesterday');
      expect(kpi.trend).toBe('up');
      expect(kpi.changePercent).toBe(50);
      expect(kpi.comparisonLabel).toBe('vs Yesterday');
    });

    test('sets trend down for negative change', () => {
      const kpi = buildKpi(50, 100);
      expect(kpi.trend).toBe('down');
    });

    test('sets trend flat for no change', () => {
      const kpi = buildKpi(100, 100);
      expect(kpi.trend).toBe('flat');
      expect(kpi.changePercent).toBe(0);
    });
  });

  describe('resolveRange', () => {
    test('defaults to 30d for unknown range', () => {
      expect(resolveRange('invalid').key).toBe('30d');
    });

    test('resolves today range', () => {
      const r = resolveRange('today');
      expect(r.key).toBe('today');
      expect(r.trunc).toBe('hour');
    });

    test('resolves 1y range', () => {
      const r = resolveRange('1y');
      expect(r.days).toBe(365);
      expect(r.trunc).toBe('month');
    });
  });

  describe('buildFinancialPeriod', () => {
    test('computes profit and margin', () => {
      const f = buildFinancialPeriod(1000, 400, 800);
      expect(f.profit).toBe(600);
      expect(f.marginPct).toBe(60);
      expect(f.changePercent).toBe(25);
    });

    test('handles zero revenue margin', () => {
      const f = buildFinancialPeriod(0, 100, 0);
      expect(f.marginPct).toBe(0);
      expect(f.profit).toBe(-100);
    });
  });

  describe('groupNotifications', () => {
    test('groups by notification type', () => {
      const groups = groupNotifications([
        { id: '1', type: 'low_stock_alert', title: 'Low', message: 'm', read_at: null, created_at: '2026-01-01' },
        { id: '2', type: 'order_placed', title: 'Order', message: 'm', read_at: null, created_at: '2026-01-01' },
        { id: '3', type: 'payment_failed', title: 'Pay', message: 'm', read_at: null, created_at: '2026-01-01' },
      ]);
      expect(groups.inventory).toHaveLength(1);
      expect(groups.orders).toHaveLength(1);
      expect(groups.payments).toHaveLength(1);
    });
  });
});
