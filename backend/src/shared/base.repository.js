const db = require('../config/database');
const { NotFoundError } = require('./errors');
const { paginate, paginationMeta } = require('../utils/helpers');
const { sanitizeSort, stripProtectedFields } = require('./sanitize');

class BaseRepository {
  constructor(tableName, tenantScoped = true, sortColumns = null) {
    this.tableName = tableName;
    this.tenantScoped = tenantScoped;
    this.sortColumns = sortColumns;
  }

  _tenantFilter(tenantId, paramIndex = 1) {
    if (!this.tenantScoped) return { clause: '', params: [], nextIndex: paramIndex };
    if (!tenantId) throw new Error(`tenant_id required for table ${this.tableName}`);
    return {
      clause: `tenant_id = $${paramIndex}`,
      params: [tenantId],
      nextIndex: paramIndex + 1,
    };
  }

  async findById(id, tenantId = null) {
    const { clause, params, nextIndex } = this._tenantFilter(tenantId);
    const conditions = [`id = $${nextIndex}`];
    const allParams = [...params, id];
    const where = clause ? `WHERE ${clause} AND ${conditions[0]}` : `WHERE ${conditions[0]}`;

    const result = await db.query(
      `SELECT * FROM ${this.tableName} ${where} LIMIT 1`,
      allParams
    );
    return result.rows[0] || null;
  }

  async findAll(tenantId, { page = 1, limit = 20, orderBy = 'created_at', order = 'DESC', filters = {} } = {}) {
    const { offset, limit: lim } = paginate(page, limit);
    const { orderBy: safeOrderBy, order: safeOrder } = sanitizeSort(orderBy, order, this.sortColumns);
    const { clause, params, nextIndex } = this._tenantFilter(tenantId);
    const conditions = clause ? [clause] : [];
    const queryParams = [...params];
    let idx = nextIndex;

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        conditions.push(`${key} = $${idx}`);
        queryParams.push(value);
        idx++;
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM ${this.tableName} ${where}`,
      queryParams
    );
    const total = countResult.rows[0].total;

    const result = await db.query(
      `SELECT * FROM ${this.tableName} ${where}
       ORDER BY ${safeOrderBy} ${safeOrder}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...queryParams, lim, offset]
    );

    return {
      rows: result.rows,
      pagination: paginationMeta(total, parseInt(page, 10), lim),
    };
  }

  async create(data, tenantId = null) {
    const record = stripProtectedFields(data);
    if (this.tenantScoped && tenantId) record.tenant_id = tenantId;

    const keys = Object.keys(record);
    const values = Object.values(record);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const result = await db.query(
      `INSERT INTO ${this.tableName} (${keys.join(', ')})
       VALUES (${placeholders})
       RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async update(id, data, tenantId = null) {
    const existing = await this.findById(id, tenantId);
    if (!existing) throw new NotFoundError(`${this.tableName} record not found`);

    const safeData = stripProtectedFields(data);
    const keys = Object.keys(safeData).filter((k) => safeData[k] !== undefined);
    if (!keys.length) return existing;

    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = keys.map((k) => safeData[k]);

    const idParamIndex = keys.length + 1;
    const { clause, params } = this._tenantFilter(tenantId, keys.length + 2);
    const where = clause
      ? `WHERE id = $${idParamIndex} AND ${clause}`
      : `WHERE id = $${idParamIndex}`;

    const result = await db.query(
      `UPDATE ${this.tableName} SET ${setClause} ${where} RETURNING *`,
      [...values, id, ...params]
    );
    return result.rows[0];
  }

  async delete(id, tenantId = null) {
    const existing = await this.findById(id, tenantId);
    if (!existing) throw new NotFoundError(`${this.tableName} record not found`);

    const { clause, params, nextIndex } = this._tenantFilter(tenantId, 2);
    const where = clause
      ? `WHERE id = $1 AND ${clause}`
      : `WHERE id = $1`;

    await db.query(`DELETE FROM ${this.tableName} ${where}`, [id, ...params]);
    return true;
  }

  async bulkDelete(ids, tenantId = null) {
    if (!ids?.length) return 0;

    const { clause, params } = this._tenantFilter(tenantId, 2);
    const where = clause
      ? `WHERE id = ANY($1::uuid[]) AND ${clause}`
      : `WHERE id = ANY($1::uuid[])`;

    const result = await db.query(
      `DELETE FROM ${this.tableName} ${where}`,
      [ids, ...params]
    );
    return result.rowCount;
  }

  async query(sql, params = []) {
    const result = await db.query(sql, params);
    return result.rows;
  }

  async queryOne(sql, params = []) {
    const rows = await this.query(sql, params);
    return rows[0] || null;
  }
}

module.exports = BaseRepository;
