const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');

const DEFAULT_ACCOUNTS = [
  { code: '1000', name: 'Cash', type: 'asset' },
  { code: '1200', name: 'Inventory', type: 'asset' },
  { code: '2000', name: 'Tax Payable', type: 'liability' },
  { code: '4000', name: 'Sales', type: 'revenue' },
  { code: '5000', name: 'COGS', type: 'expense' },
  { code: '5100', name: 'Expenses', type: 'expense' },
];

class AccountingService {
  async ensureDefaultAccounts(tenantId) {
    const count = await db.query(
      `SELECT COUNT(*)::int AS c FROM ledger_accounts WHERE tenant_id = $1`,
      [tenantId]
    );
    if (count.rows[0].c > 0) return;

    for (const a of DEFAULT_ACCOUNTS) {
      await db.query(
        `INSERT INTO ledger_accounts (tenant_id, code, name, type, is_system)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (tenant_id, code) DO NOTHING`,
        [tenantId, a.code, a.name, a.type]
      );
    }
  }

  async listAccounts(tenantId) {
    await this.ensureDefaultAccounts(tenantId);
    const result = await db.query(
      `SELECT * FROM ledger_accounts WHERE tenant_id = $1 ORDER BY code`,
      [tenantId]
    );
    return result.rows;
  }

  async createAccount(tenantId, data) {
    if (!data.code || !data.name || !data.type) {
      throw new ValidationError('code, name, and type are required');
    }
    await this.ensureDefaultAccounts(tenantId);
    const result = await db.query(
      `INSERT INTO ledger_accounts (tenant_id, code, name, type, is_system)
       VALUES ($1, $2, $3, $4, false) RETURNING *`,
      [tenantId, String(data.code), data.name, data.type]
    );
    return result.rows[0];
  }

  async createJournal(tenantId, data, userId) {
    await this.ensureDefaultAccounts(tenantId);
    const lines = Array.isArray(data.lines) ? data.lines : [];
    if (lines.length < 2) throw new ValidationError('At least two journal lines are required');

    let debit = 0;
    let credit = 0;
    for (const line of lines) {
      if (!line.account_id) throw new ValidationError('Each line requires account_id');
      debit += Number(line.debit || 0);
      credit += Number(line.credit || 0);
    }
    if (Math.abs(debit - credit) > 0.001) {
      throw new ValidationError('Journal entry must be balanced (debits = credits)');
    }

    const entryNumber = data.entry_number || `JE-${Date.now()}`;
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const entry = await client.query(
        `INSERT INTO journal_entries
           (tenant_id, entry_number, entry_date, memo, source_type, source_id, created_by)
         VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5, $6, $7) RETURNING *`,
        [
          tenantId,
          entryNumber,
          data.entry_date || null,
          data.memo || null,
          data.source_type || null,
          data.source_id || null,
          userId || null,
        ]
      );
      for (const line of lines) {
        await client.query(
          `INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, memo)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            tenantId,
            entry.rows[0].id,
            line.account_id,
            Number(line.debit || 0),
            Number(line.credit || 0),
            line.memo || null,
          ]
        );
      }
      await client.query('COMMIT');
      return this.getJournal(tenantId, entry.rows[0].id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getJournal(tenantId, id) {
    const entry = await db.query(
      `SELECT * FROM journal_entries WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (!entry.rows[0]) throw new NotFoundError('Journal entry not found');
    const lines = await db.query(
      `SELECT jl.*, la.code AS account_code, la.name AS account_name
       FROM journal_lines jl
       JOIN ledger_accounts la ON la.id = jl.account_id
       WHERE jl.journal_entry_id = $1 AND jl.tenant_id = $2`,
      [id, tenantId]
    );
    return { ...entry.rows[0], lines: lines.rows };
  }

  async listJournals(tenantId, query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = Math.min(parseInt(query.limit, 10) || 50, 100);
    const offset = (page - 1) * limit;
    const count = await db.query(
      `SELECT COUNT(*)::int AS total FROM journal_entries WHERE tenant_id = $1`,
      [tenantId]
    );
    const rows = await db.query(
      `SELECT * FROM journal_entries WHERE tenant_id = $1
       ORDER BY entry_date DESC, created_at DESC LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );
    const total = count.rows[0].total;
    return { rows: rows.rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async profitLoss(tenantId, { from, to } = {}) {
    await this.ensureDefaultAccounts(tenantId);
    const result = await db.query(
      `SELECT la.type, la.code, la.name,
              COALESCE(SUM(jl.credit - jl.debit), 0)::numeric AS amount
       FROM ledger_accounts la
       LEFT JOIN journal_lines jl ON jl.account_id = la.id AND jl.tenant_id = la.tenant_id
       LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
         AND je.entry_date BETWEEN COALESCE($2::date, CURRENT_DATE - INTERVAL '30 days')
                               AND COALESCE($3::date, CURRENT_DATE)
       WHERE la.tenant_id = $1 AND la.type IN ('revenue', 'expense')
       GROUP BY la.id
       ORDER BY la.code`,
      [tenantId, from || null, to || null]
    );
    const revenue = result.rows.filter((r) => r.type === 'revenue');
    const expenses = result.rows.filter((r) => r.type === 'expense');
    const totalRevenue = revenue.reduce((s, r) => s + Number(r.amount), 0);
    const totalExpenses = expenses.reduce((s, r) => s + Math.abs(Number(r.amount)), 0);
    return {
      revenue,
      expenses,
      total_revenue: +totalRevenue.toFixed(2),
      total_expenses: +totalExpenses.toFixed(2),
      net_income: +(totalRevenue - totalExpenses).toFixed(2),
    };
  }

  async balanceSheet(tenantId, { asOf } = {}) {
    await this.ensureDefaultAccounts(tenantId);
    const result = await db.query(
      `SELECT la.type, la.code, la.name,
              COALESCE(SUM(jl.debit - jl.credit), 0)::numeric AS balance
       FROM ledger_accounts la
       LEFT JOIN journal_lines jl ON jl.account_id = la.id AND jl.tenant_id = la.tenant_id
       LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
         AND je.entry_date <= COALESCE($2::date, CURRENT_DATE)
       WHERE la.tenant_id = $1 AND la.type IN ('asset', 'liability', 'equity')
       GROUP BY la.id
       ORDER BY la.code`,
      [tenantId, asOf || null]
    );
    const assets = result.rows.filter((r) => r.type === 'asset');
    const liabilities = result.rows.filter((r) => r.type === 'liability');
    const equity = result.rows.filter((r) => r.type === 'equity');
    return {
      assets,
      liabilities,
      equity,
      total_assets: +assets.reduce((s, r) => s + Number(r.balance), 0).toFixed(2),
      total_liabilities: +liabilities.reduce((s, r) => s + Math.abs(Number(r.balance)), 0).toFixed(2),
      total_equity: +equity.reduce((s, r) => s + Number(r.balance), 0).toFixed(2),
    };
  }

  async cashFlow(tenantId, { from, to } = {}) {
    await this.ensureDefaultAccounts(tenantId);
    const result = await db.query(
      `SELECT je.entry_date::date AS day,
              COALESCE(SUM(CASE WHEN la.code = '1000' THEN jl.debit - jl.credit ELSE 0 END), 0)::numeric AS net_cash
       FROM journal_entries je
       JOIN journal_lines jl ON jl.journal_entry_id = je.id
       JOIN ledger_accounts la ON la.id = jl.account_id
       WHERE je.tenant_id = $1
         AND je.entry_date BETWEEN COALESCE($2::date, CURRENT_DATE - INTERVAL '30 days')
                               AND COALESCE($3::date, CURRENT_DATE)
       GROUP BY 1
       ORDER BY 1`,
      [tenantId, from || null, to || null]
    );
    return { rows: result.rows };
  }

  async taxReport(tenantId, { from, to } = {}) {
    const result = await db.query(
      `SELECT created_at::date AS day,
              COUNT(*)::int AS order_count,
              COALESCE(SUM(tax_amount), 0)::numeric AS tax_collected,
              COALESCE(SUM(total_amount), 0)::numeric AS taxable_sales
       FROM orders
       WHERE tenant_id = $1 AND status IN ('paid', 'completed', 'refunded')
         AND created_at BETWEEN COALESCE($2::timestamptz, NOW() - INTERVAL '30 days')
                            AND COALESCE($3::timestamptz, NOW())
       GROUP BY 1
       ORDER BY 1`,
      [tenantId, from || null, to || null]
    );
    const total = result.rows.reduce((s, r) => s + Number(r.tax_collected), 0);
    return { rows: result.rows, total_tax: +total.toFixed(2) };
  }

  async listExchangeRates(tenantId) {
    const result = await db.query(
      `SELECT * FROM exchange_rates WHERE tenant_id = $1 ORDER BY effective_at DESC`,
      [tenantId]
    );
    return result.rows;
  }

  async upsertExchangeRate(tenantId, data) {
    if (!data.base_currency || !data.quote_currency || data.rate == null) {
      throw new ValidationError('base_currency, quote_currency, and rate are required');
    }
    const result = await db.query(
      `INSERT INTO exchange_rates (tenant_id, base_currency, quote_currency, rate, effective_at)
       VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()))
       ON CONFLICT (tenant_id, base_currency, quote_currency)
       DO UPDATE SET rate = EXCLUDED.rate, effective_at = EXCLUDED.effective_at
       RETURNING *`,
      [
        tenantId,
        String(data.base_currency).toUpperCase(),
        String(data.quote_currency).toUpperCase(),
        Number(data.rate),
        data.effective_at || null,
      ]
    );
    return result.rows[0];
  }

  async _getAutoGlSettings(tenantId) {
    const result = await db.query(
      `SELECT value FROM settings WHERE tenant_id = $1 AND key = 'accounting'`,
      [tenantId]
    );
    let val = result.rows[0]?.value;
    if (typeof val === 'string') {
      try { val = JSON.parse(val); } catch { val = {}; }
    }
    return { enabled: Boolean(val?.auto_gl_posting) };
  }

  async _accountIdByCode(tenantId, code) {
    const result = await db.query(
      `SELECT id FROM ledger_accounts WHERE tenant_id = $1 AND code = $2`,
      [tenantId, code]
    );
    return result.rows[0]?.id || null;
  }

  async postOrderPaid(tenantId, order, userId = null) {
    const { enabled } = await this._getAutoGlSettings(tenantId);
    if (!enabled) return null;
    await this.ensureDefaultAccounts(tenantId);

    const cashId = await this._accountIdByCode(tenantId, '1000');
    const salesId = await this._accountIdByCode(tenantId, '4000');
    const taxId = await this._accountIdByCode(tenantId, '2000');
    if (!cashId || !salesId) return null;

    const total = parseFloat(order.total_amount) || 0;
    const taxAmt = parseFloat(order.tax_amount) || 0;
    const netSales = +(total - taxAmt).toFixed(2);
    const lines = [
      { account_id: cashId, debit: total, credit: 0, memo: 'Sale receipt' },
      { account_id: salesId, debit: 0, credit: netSales, memo: 'Sales revenue' },
    ];
    if (taxAmt > 0 && taxId) {
      lines.push({ account_id: taxId, debit: 0, credit: taxAmt, memo: 'Tax collected' });
    }

    return this.createJournal(tenantId, {
      memo: `Auto GL — order ${order.order_number || order.id}`,
      source_type: 'order',
      source_id: order.id,
      lines,
    }, userId);
  }

  async postOrderReturn(tenantId, returnRecord, order, userId = null) {
    const { enabled } = await this._getAutoGlSettings(tenantId);
    if (!enabled) return null;
    await this.ensureDefaultAccounts(tenantId);

    const cashId = await this._accountIdByCode(tenantId, '1000');
    const salesId = await this._accountIdByCode(tenantId, '4000');
    if (!cashId || !salesId) return null;

    const refund = parseFloat(returnRecord.total_refund) || 0;
    if (refund <= 0) return null;

    return this.createJournal(tenantId, {
      memo: `Auto GL — return ${returnRecord.return_number || returnRecord.id}`,
      source_type: 'order_return',
      source_id: returnRecord.id,
      lines: [
        { account_id: salesId, debit: refund, credit: 0, memo: 'Sales reversal' },
        { account_id: cashId, debit: 0, credit: refund, memo: 'Cash refund' },
      ],
    }, userId);
  }
}

module.exports = new AccountingService();
