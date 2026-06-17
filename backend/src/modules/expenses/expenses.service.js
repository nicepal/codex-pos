const db = require('../../config/database');
const BaseRepository = require('../../shared/base.repository');
const { NotFoundError } = require('../../shared/errors');
const { pickAllowedFields } = require('../../shared/sanitize');
const { paginate, paginationMeta } = require('../../utils/helpers');
const { buildKpi } = require('../reports/dashboard.helpers');
const { EXPENSE_CATEGORIES } = require('./expenses.validation');

const WRITABLE = [
  'title', 'amount', 'category', 'expense_date', 'notes',
  'supplier_id', 'supplier_name', 'payment_method', 'status', 'receipt_url',
];

class ExpenseRepository extends BaseRepository {
  constructor() { super('expenses'); }
}

class ExpenseService {
  constructor() { this.repo = new ExpenseRepository(); }

  async list(tenantId, query = {}) {
    const { page, limit: lim } = paginate(query.page, query.limit || 50);
    const conditions = ['e.tenant_id = $1'];
    const params = [tenantId];
    let idx = 2;

    if (query.category) {
      conditions.push(`e.category = $${idx++}`);
      params.push(query.category);
    }
    if (query.status) {
      conditions.push(`e.status = $${idx++}`);
      params.push(query.status);
    }
    if (query.payment_method) {
      conditions.push(`e.payment_method = $${idx++}`);
      params.push(query.payment_method);
    }
    if (query.supplier) {
      conditions.push(`(e.supplier_name ILIKE $${idx} OR s.name ILIKE $${idx})`);
      params.push(`%${query.supplier}%`);
      idx++;
    }
    if (query.date_from) {
      conditions.push(`e.expense_date >= $${idx++}`);
      params.push(query.date_from);
    }
    if (query.date_to) {
      conditions.push(`e.expense_date <= $${idx++}`);
      params.push(query.date_to);
    }
    if (query.q) {
      conditions.push(`(e.title ILIKE $${idx} OR e.expense_number ILIKE $${idx} OR e.notes ILIKE $${idx})`);
      params.push(`%${query.q}%`);
      idx++;
    }

    const where = conditions.join(' AND ');
    const count = await db.query(
      `SELECT COUNT(*)::int AS total FROM expenses e
       LEFT JOIN suppliers s ON s.id = e.supplier_id
       WHERE ${where}`,
      params
    );

    const result = await db.query(
      `SELECT e.*,
              COALESCE(e.supplier_name, s.name) AS supplier_display,
              TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS created_by_name
       FROM expenses e
       LEFT JOIN suppliers s ON s.id = e.supplier_id
       LEFT JOIN users u ON u.id = e.created_by
       WHERE ${where}
       ORDER BY e.expense_date DESC, e.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, lim, ((parseInt(query.page, 10) || 1) - 1) * lim]
    );

    return {
      rows: result.rows,
      pagination: paginationMeta(count.rows[0].total, parseInt(query.page, 10) || 1, lim),
    };
  }

  async getById(tenantId, id) {
    const row = await this.repo.findById(id, tenantId);
    if (!row) throw new NotFoundError('Expense not found');
    return row;
  }

  async _nextExpenseNumber(tenantId) {
    const result = await db.query(
      `SELECT COUNT(*)::int AS c FROM expenses WHERE tenant_id = $1`,
      [tenantId]
    );
    const n = (result.rows[0].c || 0) + 1;
    return `EXP-${String(n).padStart(5, '0')}`;
  }

  async create(tenantId, data, userId) {
    const payload = pickAllowedFields(data, WRITABLE);
    payload.expense_number = await this._nextExpenseNumber(tenantId);
    payload.created_by = userId;
    if (payload.supplier_id) {
      const sup = await db.query('SELECT name FROM suppliers WHERE id = $1 AND tenant_id = $2', [payload.supplier_id, tenantId]);
      if (sup.rows[0]) payload.supplier_name = sup.rows[0].name;
    }
    return this.repo.create(payload, tenantId);
  }

  async update(tenantId, id, data) {
    const payload = pickAllowedFields(data, WRITABLE);
    if (payload.supplier_id) {
      const sup = await db.query('SELECT name FROM suppliers WHERE id = $1 AND tenant_id = $2', [payload.supplier_id, tenantId]);
      if (sup.rows[0]) payload.supplier_name = sup.rows[0].name;
    }
    return this.repo.update(id, payload, tenantId);
  }

  async remove(tenantId, id) {
    return this.repo.delete(id, tenantId);
  }

  async bulkRemove(tenantId, ids) {
    const { bulkRemoveByIds } = require('../../shared/bulk-delete');
    return bulkRemoveByIds((tid, itemId) => this.repo.delete(itemId, tid), tenantId, ids);
  }

  async _periodStats(tenantId, startSql, endSql, prevStartSql, prevEndSql) {
    const result = await db.query(
      `SELECT
        (SELECT COALESCE(SUM(amount), 0)::numeric FROM expenses
         WHERE tenant_id = $1 AND expense_date >= ${startSql} AND expense_date < ${endSql}) AS amount,
        (SELECT COUNT(*)::int FROM expenses
         WHERE tenant_id = $1 AND expense_date >= ${startSql} AND expense_date < ${endSql}) AS count,
        (SELECT COALESCE(SUM(amount), 0)::numeric FROM expenses
         WHERE tenant_id = $1 AND expense_date >= ${prevStartSql} AND expense_date < ${prevEndSql}) AS prev_amount`,
      [tenantId]
    );
    return result.rows[0];
  }

  async getDashboard(tenantId, query = {}) {
    const filterClause = this._buildFilterClause(tenantId, query, 1);
    const baseParams = [tenantId, ...filterClause.params];

    const [
      todayRow,
      weekRow,
      monthRow,
      yearRow,
      summaryRow,
      revenueRow,
      categoryRows,
      trendRows,
      pendingRow,
    ] = await Promise.all([
      this._periodStats(
        tenantId,
        'CURRENT_DATE',
        "CURRENT_DATE + INTERVAL '1 day'",
        "CURRENT_DATE - INTERVAL '1 day'",
        'CURRENT_DATE'
      ),
      this._periodStats(
        tenantId,
        "date_trunc('week', CURRENT_DATE)::date",
        "(date_trunc('week', CURRENT_DATE) + INTERVAL '1 week')::date",
        "(date_trunc('week', CURRENT_DATE) - INTERVAL '1 week')::date",
        "date_trunc('week', CURRENT_DATE)::date"
      ),
      this._periodStats(
        tenantId,
        "date_trunc('month', CURRENT_DATE)::date",
        "(date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date",
        "(date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date",
        "date_trunc('month', CURRENT_DATE)::date"
      ),
      this._periodStats(
        tenantId,
        "date_trunc('year', CURRENT_DATE)::date",
        "(date_trunc('year', CURRENT_DATE) + INTERVAL '1 year')::date",
        "(date_trunc('year', CURRENT_DATE) - INTERVAL '1 year')::date",
        "date_trunc('year', CURRENT_DATE)::date"
      ),
      db.query(
        `SELECT
          COALESCE(SUM(amount), 0)::numeric AS total,
          COALESCE(AVG(amount), 0)::numeric AS average,
          COALESCE(MAX(amount), 0)::numeric AS highest,
          COALESCE(MIN(amount), 0)::numeric AS lowest,
          COUNT(*)::int AS count
         FROM expenses e WHERE ${filterClause.where}`,
        baseParams
      ),
      db.query(
        `SELECT COALESCE(SUM(total_amount), 0)::numeric AS revenue
         FROM orders
         WHERE tenant_id = $1 AND status IN ('paid', 'completed')
           AND created_at >= date_trunc('month', NOW())`,
        [tenantId]
      ),
      db.query(
        `SELECT COALESCE(category, 'Other') AS category,
                COALESCE(SUM(amount), 0)::numeric AS amount,
                COUNT(*)::int AS count
         FROM expenses e WHERE ${filterClause.where}
         GROUP BY category ORDER BY amount DESC LIMIT 10`,
        baseParams
      ),
      db.query(
        `SELECT date_trunc('month', expense_date)::date AS month,
                COALESCE(SUM(amount), 0)::numeric AS amount,
                COUNT(*)::int AS count
         FROM expenses e
         WHERE e.tenant_id = $1 AND expense_date >= (CURRENT_DATE - INTERVAL '12 months')
         GROUP BY 1 ORDER BY 1`,
        [tenantId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::numeric AS amount
         FROM expenses WHERE tenant_id = $1 AND status = 'pending'`,
        [tenantId]
      ),
    ]);

    const summary = summaryRow.rows[0];
    const totalExpenses = parseFloat(summary.total) || 0;
    const revenue = parseFloat(revenueRow.rows[0].revenue) || 0;
    const profit = revenue - totalExpenses;
    const profitMargin = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;

    const categories = categoryRows.rows.map((r) => {
      const amt = parseFloat(r.amount) || 0;
      return {
        category: r.category,
        amount: amt,
        count: r.count,
        percentage: totalExpenses > 0 ? Math.round((amt / totalExpenses) * 1000) / 10 : 0,
      };
    });

    return {
      kpis: {
        today: { ...buildKpi(todayRow.amount, todayRow.prev_amount, 'vs yesterday'), count: todayRow.count },
        thisWeek: { ...buildKpi(weekRow.amount, weekRow.prev_amount, 'vs last week'), count: weekRow.count },
        thisMonth: { ...buildKpi(monthRow.amount, monthRow.prev_amount, 'vs last month'), count: monthRow.count },
        thisYear: { ...buildKpi(yearRow.amount, yearRow.prev_amount, 'vs last year'), count: yearRow.count },
      },
      summary: {
        total: totalExpenses,
        average: parseFloat(summary.average) || 0,
        highest: parseFloat(summary.highest) || 0,
        lowest: parseFloat(summary.lowest) || 0,
        count: summary.count,
      },
      pending: {
        count: pendingRow.rows[0].count,
        amount: parseFloat(pendingRow.rows[0].amount) || 0,
      },
      financialImpact: {
        revenue,
        expenses: totalExpenses,
        profit,
        profitMarginPercent: profitMargin,
      },
      categoryBreakdown: categories,
      monthlyTrend: trendRows.rows.map((r) => ({
        month: r.month,
        amount: parseFloat(r.amount) || 0,
        count: r.count,
      })),
      categories: EXPENSE_CATEGORIES,
    };
  }

  _buildFilterClause(tenantId, query, startIdx = 1) {
    const conditions = [`e.tenant_id = $${startIdx}`];
    const params = [];
    let idx = startIdx + 1;

    if (query.category) {
      conditions.push(`e.category = $${idx++}`);
      params.push(query.category);
    }
    if (query.status) {
      conditions.push(`e.status = $${idx++}`);
      params.push(query.status);
    }
    if (query.payment_method) {
      conditions.push(`e.payment_method = $${idx++}`);
      params.push(query.payment_method);
    }
    if (query.supplier) {
      conditions.push(`(e.supplier_name ILIKE $${idx} OR EXISTS (SELECT 1 FROM suppliers s WHERE s.id = e.supplier_id AND s.name ILIKE $${idx}))`);
      params.push(`%${query.supplier}%`);
      idx++;
    }
    if (query.date_from) {
      conditions.push(`e.expense_date >= $${idx++}`);
      params.push(query.date_from);
    }
    if (query.date_to) {
      conditions.push(`e.expense_date <= $${idx++}`);
      params.push(query.date_to);
    }
    if (query.q) {
      conditions.push(`(e.title ILIKE $${idx} OR e.expense_number ILIKE $${idx})`);
      params.push(`%${query.q}%`);
    }

    return { where: conditions.join(' AND '), params };
  }

  async exportCsv(tenantId, query = {}) {
    const { rows } = await this.list(tenantId, { ...query, limit: 5000, page: 1 });
    const header = 'expense_number,title,category,amount,expense_date,supplier,payment_method,status,notes\n';
    const body = rows.map((r) => [
      r.expense_number || '',
      `"${(r.title || '').replace(/"/g, '""')}"`,
      r.category || '',
      r.amount,
      r.expense_date,
      `"${(r.supplier_display || r.supplier_name || '').replace(/"/g, '""')}"`,
      r.payment_method || '',
      r.status || '',
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ].join(',')).join('\n');
    return header + body;
  }

  async importRows(tenantId, rows, userId) {
    const created = [];
    const errors = [];
    for (let i = 0; i < rows.length; i += 1) {
      try {
        const row = rows[i];
        const record = await this.create(tenantId, {
          title: row.title,
          amount: parseFloat(row.amount),
          category: EXPENSE_CATEGORIES.includes(row.category) ? row.category : 'Other',
          expense_date: row.expense_date,
          supplier_name: row.supplier_name,
          payment_method: row.payment_method || 'cash',
          status: row.status || 'paid',
          notes: row.notes,
        }, userId);
        created.push(record);
      } catch (err) {
        errors.push({ row: i + 1, message: err.message });
      }
    }
    return { imported: created.length, errors };
  }
}

module.exports = new ExpenseService();
