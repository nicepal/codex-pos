const BaseRepository = require('../../shared/base.repository');
const db = require('../../config/database');
const { NotFoundError } = require('../../shared/errors');

class CustomerRepository extends BaseRepository {
  constructor() {
    super('customers');
  }
}

class CustomerService {
  constructor() {
    this.repo = new CustomerRepository();
  }

  async list(tenantId, query) {
    return this.repo.findAll(tenantId, { page: query.page, limit: query.limit });
  }

  async getById(tenantId, id) {
    const customer = await this.repo.findById(id, tenantId);
    if (!customer) throw new NotFoundError('Customer not found');
    return customer;
  }

  async getDetail(tenantId, id) {
    const customer = await this.getById(tenantId, id);

    const orders = await db.query(
      `SELECT id, order_number, status, total_amount, payment_method, created_at
       FROM orders WHERE tenant_id = $1 AND customer_id = $2
       ORDER BY created_at DESC LIMIT 50`,
      [tenantId, id]
    );

    const stats = await db.query(
      `SELECT COUNT(*)::int AS total_orders,
              COALESCE(SUM(total_amount), 0)::numeric AS total_spent
       FROM orders WHERE tenant_id = $1 AND customer_id = $2 AND status IN ('paid', 'completed')`,
      [tenantId, id]
    );

    return {
      ...customer,
      stats: stats.rows[0],
      orders: orders.rows,
    };
  }

  async create(tenantId, data) {
    return this.repo.create(data, tenantId);
  }

  async update(tenantId, id, data) {
    return this.repo.update(id, data, tenantId);
  }

  async remove(tenantId, id) {
    return this.repo.delete(id, tenantId);
  }
}

module.exports = new CustomerService();
