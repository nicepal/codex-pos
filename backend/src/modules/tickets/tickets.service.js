const db = require('../../config/database');
const BaseRepository = require('../../shared/base.repository');
const { NotFoundError, ValidationError, ForbiddenError } = require('../../shared/errors');
const { generateTicketNumber } = require('../../utils/helpers');

class TicketRepository extends BaseRepository {
  constructor() {
    super('tickets');
  }

  async findWithMessages(tenantId, id) {
    const ticket = tenantId
      ? await this.findById(id, tenantId)
      : await this.queryOne('SELECT * FROM tickets WHERE id = $1', [id]);
    if (!ticket) return null;

    const messages = await db.query(
      `SELECT tm.*, u.first_name, u.last_name, u.email, u.phone,
              COALESCE(
                (SELECT array_agg(DISTINCT r.name)
                 FROM user_roles ur
                 JOIN roles r ON r.id = ur.role_id
                 WHERE ur.user_id = u.id),
                ARRAY[]::text[]
              ) AS roles
       FROM ticket_messages tm
       LEFT JOIN users u ON u.id = tm.user_id
       WHERE tm.ticket_id = $1 ORDER BY tm.created_at`,
      [id]
    );

    let customer = null;
    if (ticket.user_id) {
      const userRow = await db.query(
        `SELECT first_name, last_name, email, phone FROM users WHERE id = $1`,
        [ticket.user_id]
      );
      customer = userRow.rows[0] || null;
    }

    return { ...ticket, customer, messages: messages.rows };
  }
}

class TicketService {
  constructor() {
    this.repo = new TicketRepository();
  }

  _isPlatformStaff(user) {
    return user?.roles?.some((r) => ['super_admin', 'support_agent'].includes(r));
  }

  async _getTicketOrThrow(ticketId) {
    const ticket = await this.repo.queryOne('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    if (!ticket) throw new NotFoundError('Ticket not found');
    return ticket;
  }

  async _assertTicketAccess(ticketId, { tenantId, user }) {
    const ticket = await this._getTicketOrThrow(ticketId);
    if (this._isPlatformStaff(user)) return ticket;
    if (tenantId && ticket.tenant_id === tenantId) return ticket;
    if (ticket.user_id === user.id) return ticket;
    throw new ForbiddenError('Access denied to this ticket');
  }

  async list(tenantId, query) {
    if (!tenantId && query.all !== 'true') {
      return { rows: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    }
    if (!tenantId) {
      const offset = ((parseInt(query.page, 10) || 1) - 1) * (parseInt(query.limit, 10) || 20);
      const limit = parseInt(query.limit, 10) || 20;
      const conditions = ['1=1'];
      const params = [];
      let idx = 1;
      if (query.status) { conditions.push(`t.status = $${idx++}`); params.push(query.status); }
      const where = conditions.join(' AND ');
      const count = await db.query(`SELECT COUNT(*)::int AS total FROM tickets t WHERE ${where}`, params);
      const result = await db.query(
        `SELECT t.*, tn.name AS tenant_name, u.email AS user_email
         FROM tickets t
         LEFT JOIN tenants tn ON tn.id = t.tenant_id
         LEFT JOIN users u ON u.id = t.user_id
         WHERE ${where} ORDER BY t.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      );
      return { rows: result.rows, pagination: { total: count.rows[0].total, page: parseInt(query.page, 10) || 1, limit, totalPages: Math.ceil(count.rows[0].total / limit) } };
    }
    return this.repo.findAll(tenantId, { page: query.page, limit: query.limit, filters: { status: query.status } });
  }

  async getById(tenantId, id, user) {
    if (!this._isPlatformStaff(user) && tenantId) {
      const ticket = await this.repo.findWithMessages(tenantId, id);
      if (!ticket) throw new NotFoundError('Ticket not found');
      return ticket;
    }
    const ticket = await this.repo.findWithMessages(null, id);
    if (!ticket) throw new NotFoundError('Ticket not found');
    return ticket;
  }

  async create(tenantId, data) {
    if (!tenantId) throw new ValidationError('Tenant is required');
    return this.repo.create({
      ...data,
      ticket_number: generateTicketNumber(),
      user_id: data.user_id,
      status: 'open',
    }, tenantId);
  }

  async reply(ticketId, user, message, isInternal = false) {
    await this._assertTicketAccess(ticketId, { tenantId: user.tenant_id, user });
    await db.query(
      `INSERT INTO ticket_messages (ticket_id, user_id, message, is_internal) VALUES ($1, $2, $3, $4)`,
      [ticketId, user.id, message, isInternal]
    );
    await db.query(
      `UPDATE tickets SET status = 'in_progress', updated_at = NOW() WHERE id = $1`,
      [ticketId]
    );
    return this.repo.findWithMessages(user.tenant_id, ticketId)
      || this.repo.findWithMessages(null, ticketId);
  }

  async assign(ticketId, assignedTo) {
    await this._getTicketOrThrow(ticketId);
    await db.query(
      `UPDATE tickets SET assigned_to = $1, status = 'in_progress', updated_at = NOW() WHERE id = $2`,
      [assignedTo, ticketId]
    );
    return this.repo.queryOne('SELECT * FROM tickets WHERE id = $1', [ticketId]);
  }

  async close(ticketId, context) {
    await this._assertTicketAccess(ticketId, context);
    await db.query(
      `UPDATE tickets SET status = 'closed', closed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [ticketId]
    );
    return this.repo.queryOne('SELECT * FROM tickets WHERE id = $1', [ticketId]);
  }

  async resolve(ticketId, context) {
    await this._assertTicketAccess(ticketId, context);
    await db.query(
      `UPDATE tickets SET status = 'resolved', closed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [ticketId]
    );
    const ticket = await this.repo.findWithMessages(context.tenantId, ticketId)
      || await this.repo.findWithMessages(null, ticketId);
    return ticket;
  }

  async reopen(ticketId, context) {
    await this._assertTicketAccess(ticketId, context);
    await db.query(
      `UPDATE tickets SET status = 'open', closed_at = NULL, updated_at = NOW() WHERE id = $1`,
      [ticketId]
    );
    return this.repo.queryOne('SELECT * FROM tickets WHERE id = $1', [ticketId]);
  }
}

module.exports = new TicketService();
