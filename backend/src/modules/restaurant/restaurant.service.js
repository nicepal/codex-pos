const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const {
  TABLE_STATUSES,
  TABLE_SHAPES,
  SESSION_STATUSES,
  DEFAULT_RESTAURANT_SETTINGS,
  mergeRestaurantSettings,
  canOpenTable,
  canCloseSession,
  resolvePostCloseTableStatus,
} = require('./restaurant.helpers');

const { mergeKdsSettings, DEFAULT_KDS_SETTINGS } = require('../kitchen/kitchen.helpers');

class RestaurantService {
  async _validateBranch(tenantId, branchId, client = db) {
    if (!branchId) throw new ValidationError('branch_id is required');
    const result = await client.query(
      'SELECT id FROM branches WHERE id = $1 AND tenant_id = $2',
      [branchId, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Branch not found');
    return result.rows[0].id;
  }

  async _validateEmployee(tenantId, employeeId, client = db) {
    if (!employeeId) return null;
    const result = await client.query(
      'SELECT id FROM employees WHERE id = $1 AND tenant_id = $2',
      [employeeId, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Employee not found');
    return result.rows[0].id;
  }

  async _getFloor(tenantId, floorId) {
    const result = await db.query(
      'SELECT * FROM restaurant_floors WHERE id = $1 AND tenant_id = $2',
      [floorId, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Floor not found');
    return result.rows[0];
  }

  async _getTable(tenantId, tableId) {
    const result = await db.query(
      `SELECT t.*, f.name AS floor_name
       FROM restaurant_tables t
       JOIN restaurant_floors f ON f.id = t.floor_id AND f.tenant_id = t.tenant_id
       WHERE t.id = $1 AND t.tenant_id = $2`,
      [tableId, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Table not found');
    return result.rows[0];
  }

  async getSettings(tenantId) {
    const result = await db.query(
      `SELECT value FROM settings WHERE tenant_id = $1 AND key = 'restaurant'`,
      [tenantId]
    );
    let stored = result.rows[0]?.value;
    if (typeof stored === 'string') {
      try { stored = JSON.parse(stored); } catch { stored = {}; }
    }
    return mergeRestaurantSettings(stored || {});
  }

  async updateSettings(tenantId, data) {
    const current = await this.getSettings(tenantId);
    const merged = mergeRestaurantSettings({ ...current, ...data });
    if (merged.default_floor_id) {
      await this._getFloor(tenantId, merged.default_floor_id);
    }
    await db.query(
      `INSERT INTO settings (tenant_id, key, value)
       VALUES ($1, 'restaurant', $2::jsonb)
       ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value`,
      [tenantId, JSON.stringify(merged)]
    );
    return merged;
  }

  async listFloors(tenantId, { branch_id: branchId } = {}) {
    const params = [tenantId];
    let where = 'tenant_id = $1';
    if (branchId) {
      params.push(branchId);
      where += ` AND branch_id = $${params.length}`;
    }
    const result = await db.query(
      `SELECT * FROM restaurant_floors WHERE ${where} ORDER BY sort_order ASC, name ASC`,
      params
    );
    return result.rows;
  }

  async createFloor(tenantId, data) {
    await this._validateBranch(tenantId, data.branch_id);
    const result = await db.query(
      `INSERT INTO restaurant_floors (tenant_id, branch_id, name, sort_order, active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tenantId, data.branch_id, data.name, data.sort_order ?? 0, data.active !== false]
    );
    return result.rows[0];
  }

  async updateFloor(tenantId, id, data) {
    await this._getFloor(tenantId, id);
    if (data.branch_id) await this._validateBranch(tenantId, data.branch_id);
    const result = await db.query(
      `UPDATE restaurant_floors
       SET branch_id = COALESCE($3, branch_id),
           name = COALESCE($4, name),
           sort_order = COALESCE($5, sort_order),
           active = COALESCE($6, active)
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [
        id,
        tenantId,
        data.branch_id || null,
        data.name || null,
        data.sort_order != null ? data.sort_order : null,
        data.active != null ? data.active : null,
      ]
    );
    return result.rows[0];
  }

  async deleteFloor(tenantId, id) {
    const floor = await this._getFloor(tenantId, id);
    const tables = await db.query(
      `SELECT COUNT(*)::int AS count FROM restaurant_tables WHERE floor_id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (tables.rows[0].count > 0) {
      throw new ValidationError('Remove or reassign tables before deleting this floor');
    }
    await db.query(
      `DELETE FROM restaurant_floors WHERE id = $1 AND tenant_id = $2`,
      [floor.id, tenantId]
    );
    return { deleted: true };
  }

  async listTables(tenantId, { branch_id: branchId, floor_id: floorId } = {}) {
    const params = [tenantId];
    let where = 't.tenant_id = $1';
    if (branchId) {
      params.push(branchId);
      where += ` AND t.branch_id = $${params.length}`;
    }
    if (floorId) {
      params.push(floorId);
      where += ` AND t.floor_id = $${params.length}`;
    }
    const result = await db.query(
      `SELECT t.*, f.name AS floor_name,
              s.id AS session_id, s.guest_count AS session_guest_count,
              s.opened_at AS session_opened_at, s.employee_id AS session_employee_id
       FROM restaurant_tables t
       JOIN restaurant_floors f ON f.id = t.floor_id AND f.tenant_id = t.tenant_id
       LEFT JOIN restaurant_table_sessions s
         ON s.table_id = t.id AND s.tenant_id = t.tenant_id AND s.status = 'open'
       WHERE ${where}
       ORDER BY f.sort_order ASC, t.position_y ASC, t.position_x ASC, t.name ASC`,
      params
    );
    return result.rows;
  }

  async createTable(tenantId, data) {
    await this._validateBranch(tenantId, data.branch_id);
    const floor = await this._getFloor(tenantId, data.floor_id);
    if (floor.branch_id !== data.branch_id) {
      throw new ValidationError('floor_id must belong to the specified branch');
    }
    const result = await db.query(
      `INSERT INTO restaurant_tables
         (tenant_id, branch_id, floor_id, name, capacity, position_x, position_y, shape, status, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        tenantId,
        data.branch_id,
        data.floor_id,
        data.name,
        data.capacity ?? 2,
        data.position_x ?? 0,
        data.position_y ?? 0,
        data.shape || 'square',
        data.status || 'available',
        data.active !== false,
      ]
    );
    return result.rows[0];
  }

  async updateTable(tenantId, id, data) {
    await this._getTable(tenantId, id);
    if (data.branch_id) await this._validateBranch(tenantId, data.branch_id);
    if (data.floor_id) {
      const floor = await this._getFloor(tenantId, data.floor_id);
      const branchId = data.branch_id || (await this._getTable(tenantId, id)).branch_id;
      if (floor.branch_id !== branchId) {
        throw new ValidationError('floor_id must belong to the table branch');
      }
    }
    const result = await db.query(
      `UPDATE restaurant_tables
       SET branch_id = COALESCE($3, branch_id),
           floor_id = COALESCE($4, floor_id),
           name = COALESCE($5, name),
           capacity = COALESCE($6, capacity),
           position_x = COALESCE($7, position_x),
           position_y = COALESCE($8, position_y),
           shape = COALESCE($9, shape),
           status = COALESCE($10, status),
           active = COALESCE($11, active)
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [
        id,
        tenantId,
        data.branch_id || null,
        data.floor_id || null,
        data.name || null,
        data.capacity != null ? data.capacity : null,
        data.position_x != null ? data.position_x : null,
        data.position_y != null ? data.position_y : null,
        data.shape || null,
        data.status || null,
        data.active != null ? data.active : null,
      ]
    );
    return result.rows[0];
  }

  async deleteTable(tenantId, id) {
    const table = await this._getTable(tenantId, id);
    const open = await db.query(
      `SELECT id FROM restaurant_table_sessions
       WHERE table_id = $1 AND tenant_id = $2 AND status = 'open' LIMIT 1`,
      [id, tenantId]
    );
    if (open.rows[0]) {
      throw new ValidationError('Close the active session before deleting this table');
    }
    await db.query(
      `DELETE FROM restaurant_tables WHERE id = $1 AND tenant_id = $2`,
      [table.id, tenantId]
    );
    return { deleted: true };
  }

  async getActiveSession(tenantId, tableId) {
    await this._getTable(tenantId, tableId);
    const result = await db.query(
      `SELECT s.*, e.name AS employee_name, t.name AS table_name
       FROM restaurant_table_sessions s
       JOIN restaurant_tables t ON t.id = s.table_id AND t.tenant_id = s.tenant_id
       LEFT JOIN employees e ON e.id = s.employee_id
       WHERE s.table_id = $1 AND s.tenant_id = $2 AND s.status = 'open'
       ORDER BY s.opened_at DESC LIMIT 1`,
      [tableId, tenantId]
    );
    return result.rows[0] || null;
  }

  async openTableSession(tenantId, tableId, data = {}) {
    const table = await this._getTable(tenantId, tableId);
    const active = await this.getActiveSession(tenantId, tableId);
    const gate = canOpenTable(table.status, Boolean(active));
    if (!gate.ok) throw new ValidationError(gate.reason);

    const settings = await this.getSettings(tenantId);
    const guestCount = data.guest_count ?? settings.default_guest_count ?? 2;
    if (data.employee_id) await this._validateEmployee(tenantId, data.employee_id);

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const session = await client.query(
        `INSERT INTO restaurant_table_sessions
           (tenant_id, branch_id, table_id, employee_id, guest_count, status)
         VALUES ($1, $2, $3, $4, $5, 'open') RETURNING *`,
        [tenantId, table.branch_id, tableId, data.employee_id || null, guestCount]
      );
      await client.query(
        `UPDATE restaurant_tables SET status = 'occupied' WHERE id = $1 AND tenant_id = $2`,
        [tableId, tenantId]
      );
      await client.query('COMMIT');
      return session.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async closeTableSession(tenantId, tableId) {
    const session = await this.getActiveSession(tenantId, tableId);
    const gate = canCloseSession(session);
    if (!gate.ok) throw new ValidationError(gate.reason);

    const settings = await this.getSettings(tenantId);
    const nextStatus = resolvePostCloseTableStatus(settings);

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const closed = await client.query(
        `UPDATE restaurant_table_sessions
         SET status = 'closed', closed_at = NOW()
         WHERE id = $1 AND tenant_id = $2 RETURNING *`,
        [session.id, tenantId]
      );
      await client.query(
        `UPDATE restaurant_tables SET status = $3 WHERE id = $1 AND tenant_id = $2`,
        [tableId, tenantId, nextStatus]
      );
      await client.query('COMMIT');
      return closed.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getActiveOrderForSession(tenantId, sessionId) {
    const result = await db.query(
      `SELECT o.*
       FROM orders o
       WHERE o.tenant_id = $1 AND o.dining_session_id = $2
         AND o.status IN ('pending', 'on_hold')
       ORDER BY o.created_at DESC
       LIMIT 1`,
      [tenantId, sessionId]
    );
    if (!result.rows[0]) return null;
    const orderService = require('../orders/orders.service');
    const order = await orderService.getById(tenantId, result.rows[0].id);
    const kitchenService = require('../kitchen/kitchen.service');
    const statuses = await kitchenService.getTicketItemStatuses(
      tenantId,
      (order.items || []).map((i) => i.id)
    );
    order.items = (order.items || []).map((item) => ({
      ...item,
      kitchen_status: statuses[item.id] || null,
    }));
    return order;
  }

  async getActiveOrderForTable(tenantId, tableId) {
    const session = await this.getActiveSession(tenantId, tableId);
    if (!session) return { session: null, order: null };
    const order = await this.getActiveOrderForSession(tenantId, session.id);
    return { session, order };
  }

  async getDashboard(tenantId, { branch_id: branchId } = {}) {
    const params = [tenantId];
    let branchFilter = '';
    if (branchId) {
      params.push(branchId);
      branchFilter = ` AND branch_id = $${params.length}`;
    }

    const kitchenService = require('../kitchen/kitchen.service');

    const [tables, sessions, floors, kds] = await Promise.all([
      db.query(
        `SELECT status, COUNT(*)::int AS count
         FROM restaurant_tables WHERE tenant_id = $1${branchFilter} AND active = true
         GROUP BY status`,
        params
      ),
      db.query(
        `SELECT COUNT(*)::int AS active_sessions,
                COALESCE(SUM(guest_count), 0)::int AS total_guests
         FROM restaurant_table_sessions
         WHERE tenant_id = $1 AND status = 'open'${branchFilter}`,
        params
      ),
      db.query(
        `SELECT COUNT(*)::int AS floor_count FROM restaurant_floors
         WHERE tenant_id = $1${branchFilter} AND active = true`,
        params
      ),
      kitchenService.getKdsMetrics(tenantId, { branch_id: branchId }),
    ]);

    const statusCounts = Object.fromEntries(
      tables.rows.map((r) => [r.status, r.count])
    );

    return {
      floors: floors.rows[0].floor_count,
      tables_total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      tables_available: statusCounts.available || 0,
      tables_occupied: statusCounts.occupied || 0,
      tables_reserved: statusCounts.reserved || 0,
      tables_cleaning: statusCounts.cleaning || 0,
      active_sessions: sessions.rows[0].active_sessions,
      total_guests: sessions.rows[0].total_guests,
      kds_active: kds.active,
      kds_preparing: kds.preparing,
      kds_ready: kds.ready,
      kds_overdue: kds.overdue,
      kds_completed_today: kds.completed_today,
    };
  }

  async sendOrderToKitchen(tenantId, orderId, data, userId) {
    const { resolveTenantFeatures } = require('../../shared/features');
    const features = await resolveTenantFeatures(tenantId);
    const kitchenService = require('../kitchen/kitchen.service');
    return kitchenService.sendOrderItemsToKitchen(tenantId, orderId, {
      item_ids: data.item_ids,
      branchId: data.branch_id,
      userId,
      features,
    });
  }

  async appendOrderItems(tenantId, orderId, data, userId) {
    const orderService = require('../orders/orders.service');
    return orderService.appendItemsToOpenOrder(tenantId, orderId, data, userId);
  }
}

module.exports = new RestaurantService();
