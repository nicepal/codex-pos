const db = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const { isFeatureEnabled } = require('../../shared/features');
const {
  isKitchenItem,
  resolveStationId,
  deriveOrderKitchenStatus,
  canTransitionTicket,
  mergeKdsSettings,
  normalizeTicketStatus,
  ticketStatusToOrderItemStatus,
} = require('./kitchen.helpers');

async function loadRestaurantKdsSettings(client, tenantId) {
  const result = await client.query(
    `SELECT value FROM settings WHERE tenant_id = $1 AND key = 'restaurant'`,
    [tenantId]
  );
  let stored = result.rows[0]?.value;
  if (typeof stored === 'string') {
    try { stored = JSON.parse(stored); } catch { stored = {}; }
  }
  return mergeKdsSettings(stored || {});
}

async function nextTicketNumber(client, tenantId, branchId) {
  const counter = await client.query(
    `INSERT INTO kitchen_ticket_counters (tenant_id, branch_id, last_number)
     VALUES ($1, $2, 1000)
     ON CONFLICT (tenant_id, branch_id) DO UPDATE
       SET last_number = kitchen_ticket_counters.last_number + 1
     RETURNING last_number`,
    [tenantId, branchId]
  );
  return `K-${counter.rows[0].last_number}`;
}

async function loadProductKitchenMeta(client, tenantId, productIds) {
  if (!productIds.length) return new Map();
  const result = await client.query(
    `SELECT p.id, p.requires_kitchen, p.kitchen_station_id, p.category_id,
            c.kitchen_station_id AS category_station_id
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id AND c.tenant_id = p.tenant_id
     WHERE p.tenant_id = $1 AND p.id = ANY($2::uuid[])`,
    [tenantId, productIds]
  );
  return new Map(result.rows.map((r) => [r.id, r]));
}

function groupItemsByStation(items, productMeta, defaultStationId) {
  const groups = new Map();
  for (const item of items) {
    const meta = productMeta.get(item.product_id);
    const category = meta ? { kitchen_station_id: meta.category_station_id } : null;
    if (!isKitchenItem(meta, category)) continue;
    const stationId = resolveStationId(meta, category, defaultStationId) || '__default__';
    if (!groups.has(stationId)) groups.set(stationId, []);
    groups.get(stationId).push(item);
  }
  return groups;
}

async function syncOrderItemKitchenStatuses(client, tenantId, orderItemIds, ticketStatus) {
  if (!orderItemIds?.length) return;
  const itemStatus = ticketStatusToOrderItemStatus(normalizeTicketStatus(ticketStatus));
  if (!itemStatus) return;
  await client.query(
    `UPDATE order_items SET kitchen_status = $3
     WHERE tenant_id = $1 AND id = ANY($2::uuid[])
       AND (kitchen_status IS NULL OR kitchen_status NOT IN ('cancelled', 'served')
         OR $3 = 'cancelled' OR $3 = 'served')`,
    [tenantId, orderItemIds, itemStatus]
  );
}

async function syncOrderKitchenStatus(client, tenantId, orderId) {
  const tickets = await client.query(
    `SELECT status FROM kitchen_tickets WHERE tenant_id = $1 AND order_id = $2`,
    [tenantId, orderId]
  );
  const next = deriveOrderKitchenStatus(tickets.rows.map((r) => r.status));
  await client.query(
    `UPDATE orders SET kitchen_status = $3 WHERE id = $1 AND tenant_id = $2`,
    [orderId, tenantId, next]
  );
  return next;
}

async function writeAuditLog(tenantId, userId, action, entityId, newValues) {
  try {
    await db.query(
      `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, new_values)
       VALUES ($1, $2, $3, 'kitchen_ticket', $4, $5::jsonb)`,
      [tenantId, userId || null, action, entityId, JSON.stringify(newValues || {})]
    );
  } catch (_) { /* non-blocking */ }
}

function emitKitchenEvent(tenantId, branchId, event, payload) {
  try {
    const { emitToBranch } = require('../../realtime/socket');
    emitToBranch(tenantId, branchId, event, payload);
  } catch (_) { /* optional */ }
}

class KitchenService {
  /**
   * Create kitchen tickets for order items inside the caller's transaction.
   * Idempotent: skips order_items that already have active ticket items.
   */
  async createTicketsForOrder(client, tenantId, {
    orderId,
    branchId,
    diningSessionId,
    tableId,
    sendToKitchen,
    orderItems,
    features,
  }) {
    if (!sendToKitchen || !isFeatureEnabled(features, 'restaurant_pro')) {
      return [];
    }
    if (!orderItems?.length) return [];

    const settings = await loadRestaurantKdsSettings(client, tenantId);
    if (settings.kitchen_enabled === false) return [];

    const productIds = [...new Set(orderItems.map((i) => i.product_id).filter(Boolean))];
    const productMeta = await loadProductKitchenMeta(client, tenantId, productIds);

    const eligible = orderItems.filter((item) => {
      const meta = productMeta.get(item.product_id);
      return isKitchenItem(meta, { kitchen_station_id: meta?.category_station_id });
    });
    if (!eligible.length) return [];

    const existing = await client.query(
      `SELECT order_item_id FROM kitchen_ticket_items
       WHERE tenant_id = $1 AND order_item_id = ANY($2::uuid[]) AND status != 'cancelled'`,
      [tenantId, eligible.map((i) => i.order_item_id)]
    );
    const existingSet = new Set(existing.rows.map((r) => r.order_item_id));
    const newItems = eligible.filter((i) => !existingSet.has(i.order_item_id));
    if (!newItems.length) return [];

    const groups = groupItemsByStation(newItems, productMeta, settings.default_station_id);
    const createdTickets = [];

    for (const [stationKey, stationItems] of groups.entries()) {
      const stationId = stationKey === '__default__' ? null : stationKey;
      const ticketNumber = await nextTicketNumber(client, tenantId, branchId);

      const ticketResult = await client.query(
        `INSERT INTO kitchen_tickets
           (tenant_id, branch_id, order_id, dining_session_id, table_id, ticket_number, status, station_id)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
         RETURNING *`,
        [tenantId, branchId, orderId, diningSessionId || null, tableId || null, ticketNumber, stationId]
      );
      const ticket = ticketResult.rows[0];

      for (const item of stationItems) {
        const modifiers = item.metadata?.modifiers || [];
        const notes = item.metadata?.notes || null;
        await client.query(
          `INSERT INTO kitchen_ticket_items
             (tenant_id, kitchen_ticket_id, order_item_id, product_id, product_name, quantity, notes, modifiers, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, 'pending')
           ON CONFLICT DO NOTHING`,
          [
            tenantId,
            ticket.id,
            item.order_item_id,
            item.product_id,
            item.product_name,
            item.quantity,
            notes,
            JSON.stringify(modifiers),
          ]
        );
      }

      await syncOrderItemKitchenStatuses(
        client,
        tenantId,
        stationItems.map((i) => i.order_item_id),
        'pending'
      );

      createdTickets.push(ticket);
    }

    await syncOrderKitchenStatus(client, tenantId, orderId);
    return createdTickets;
  }

  /**
   * Standalone partial send — creates tickets for unsent kitchen-eligible order items.
   * Idempotent via unique index on kitchen_ticket_items.order_item_id.
   */
  async sendOrderItemsToKitchen(tenantId, orderId, { item_ids: itemIds, branchId, userId, features }) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const orderRes = await client.query(
        `SELECT * FROM orders WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
        [orderId, tenantId]
      );
      const order = orderRes.rows[0];
      if (!order) throw new NotFoundError('Order not found');
      if (!['pending', 'on_hold'].includes(order.status)) {
        throw new ValidationError('Kitchen send is only allowed for open orders');
      }
      if (branchId && order.branch_id && order.branch_id !== branchId) {
        throw new NotFoundError('Order not found');
      }

      const itemsRes = await client.query(
        `SELECT id AS order_item_id, product_id, product_name, quantity, metadata, kitchen_status
         FROM order_items
         WHERE order_id = $1 AND tenant_id = $2`,
        [orderId, tenantId]
      );
      let candidates = itemsRes.rows.filter((i) => {
        const ks = i.kitchen_status;
        return !ks || ks === 'not_sent';
      });
      if (itemIds?.length) {
        const idSet = new Set(itemIds);
        candidates = candidates.filter((i) => idSet.has(i.order_item_id));
      }
      if (!candidates.length) {
        await client.query('COMMIT');
        const statuses = await this.getTicketItemStatuses(tenantId, itemsRes.rows.map((i) => i.order_item_id));
        return { tickets: [], item_statuses: statuses, order_id: orderId };
      }

      const effectiveBranchId = branchId || order.branch_id
        || await require('../inventory/branch-stock.service').getDefaultBranchId(tenantId, client);

      const createdTickets = await this.createTicketsForOrder(client, tenantId, {
        orderId,
        branchId: effectiveBranchId,
        diningSessionId: order.dining_session_id,
        tableId: order.table_id,
        sendToKitchen: true,
        orderItems: candidates.map((i) => ({
          order_item_id: i.order_item_id,
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.quantity,
          metadata: typeof i.metadata === 'string' ? JSON.parse(i.metadata) : (i.metadata || {}),
        })),
        features: features || {},
      });

      await client.query('COMMIT');

      for (const ticket of createdTickets) {
        emitKitchenEvent(tenantId, effectiveBranchId, 'kitchen.ticket.created', {
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          order_id: orderId,
        });
      }

      await writeAuditLog(tenantId, userId, 'kitchen.order.sent', orderId, {
        item_count: candidates.length,
        ticket_count: createdTickets.length,
      });

      const statuses = await this.getTicketItemStatuses(
        tenantId,
        itemsRes.rows.map((i) => i.order_item_id)
      );
      return { tickets: createdTickets, item_statuses: statuses, order_id: orderId };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async cancelTicketItemsForOrderItems(client, tenantId, orderItemIds, userId) {
    if (!orderItemIds?.length) return [];
    const result = await client.query(
      `UPDATE kitchen_ticket_items
       SET status = 'cancelled', completed_at = NOW()
       WHERE tenant_id = $1 AND order_item_id = ANY($2::uuid[])
         AND status NOT IN ('cancelled', 'served', 'completed')
       RETURNING *`,
      [tenantId, orderItemIds]
    );

    await syncOrderItemKitchenStatuses(client, tenantId, orderItemIds, 'cancelled');

    const ticketIds = [...new Set(result.rows.map((r) => r.kitchen_ticket_id))];
    for (const ticketId of ticketIds) {
      const items = await client.query(
        `SELECT status FROM kitchen_ticket_items WHERE kitchen_ticket_id = $1 AND tenant_id = $2`,
        [ticketId, tenantId]
      );
      const statuses = items.rows.map((r) => r.status);
      if (statuses.length && statuses.every((s) => s === 'cancelled')) {
        await client.query(
          `UPDATE kitchen_tickets SET status = 'cancelled', cancelled_at = NOW()
           WHERE id = $1 AND tenant_id = $2`,
          [ticketId, tenantId]
        );
      }
      const ticket = await client.query(
        `SELECT * FROM kitchen_tickets WHERE id = $1 AND tenant_id = $2`,
        [ticketId, tenantId]
      );
      if (ticket.rows[0]) {
        await syncOrderKitchenStatus(client, tenantId, ticket.rows[0].order_id);
      }
    }

    return result.rows;
  }

  async notifyTicketsCreated(tenantId, branchId, tickets) {
    for (const ticket of tickets) {
      emitKitchenEvent(tenantId, branchId, 'kitchen.ticket.created', { id: ticket.id, ticket_number: ticket.ticket_number });
    }
  }

  async getTicketItemStatuses(tenantId, orderItemIds) {
    if (!orderItemIds?.length) return {};
    const fromOrderItems = await db.query(
      `SELECT id, kitchen_status FROM order_items
       WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
      [tenantId, orderItemIds]
    );
    const out = {};
    for (const row of fromOrderItems.rows) {
      if (row.kitchen_status) out[row.id] = row.kitchen_status;
    }
    const missing = orderItemIds.filter((id) => !out[id]);
    if (!missing.length) return out;

    const fromTickets = await db.query(
      `SELECT order_item_id, status FROM kitchen_ticket_items
       WHERE tenant_id = $1 AND order_item_id = ANY($2::uuid[]) AND status != 'cancelled'`,
      [tenantId, missing]
    );
    for (const row of fromTickets.rows) {
      out[row.order_item_id] = ticketStatusToOrderItemStatus(row.status) || row.status;
    }
    return out;
  }

  async getTicketById(tenantId, ticketId, { branchId } = {}) {
    const params = [ticketId, tenantId];
    let where = 't.id = $1 AND t.tenant_id = $2';
    if (branchId) {
      params.push(branchId);
      where += ` AND t.branch_id = $${params.length}`;
    }
    const ticket = await db.query(
      `SELECT t.*,
              rt.name AS table_name,
              o.guest_count, o.notes AS order_notes,
              o.dining_session_id
       FROM kitchen_tickets t
       LEFT JOIN restaurant_tables rt ON rt.id = t.table_id AND rt.tenant_id = t.tenant_id
       LEFT JOIN orders o ON o.id = t.order_id AND o.tenant_id = t.tenant_id
       WHERE ${where}`,
      params
    );
    if (!ticket.rows[0]) throw new NotFoundError('Kitchen ticket not found');

    const items = await db.query(
      `SELECT * FROM kitchen_ticket_items
       WHERE kitchen_ticket_id = $1 AND tenant_id = $2
       ORDER BY created_at ASC`,
      [ticketId, tenantId]
    );

    return { ...ticket.rows[0], items: items.rows };
  }

  async listTickets(tenantId, { branch_id: branchId, status, station_id: stationId, active_only: activeOnly } = {}) {
    const params = [tenantId];
    let where = 't.tenant_id = $1';
    if (branchId) {
      params.push(branchId);
      where += ` AND t.branch_id = $${params.length}`;
    }
    if (stationId) {
      params.push(stationId);
      where += ` AND t.station_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      where += ` AND t.status = $${params.length}`;
    } else if (activeOnly !== false) {
      where += ` AND t.status IN ('pending', 'accepted', 'preparing', 'ready')`;
    }

    const result = await db.query(
      `SELECT t.*,
              rt.name AS table_name,
              o.guest_count
       FROM kitchen_tickets t
       LEFT JOIN restaurant_tables rt ON rt.id = t.table_id AND rt.tenant_id = t.tenant_id
       LEFT JOIN orders o ON o.id = t.order_id AND o.tenant_id = t.tenant_id
       WHERE ${where}
       ORDER BY t.priority DESC, t.created_at ASC`,
      params
    );

    const ticketIds = result.rows.map((r) => r.id);
    if (!ticketIds.length) return [];

    const items = await db.query(
      `SELECT * FROM kitchen_ticket_items
       WHERE tenant_id = $1 AND kitchen_ticket_id = ANY($2::uuid[])
       ORDER BY created_at ASC`,
      [tenantId, ticketIds]
    );
    const itemsByTicket = new Map();
    for (const item of items.rows) {
      if (!itemsByTicket.has(item.kitchen_ticket_id)) itemsByTicket.set(item.kitchen_ticket_id, []);
      itemsByTicket.get(item.kitchen_ticket_id).push(item);
    }

    return result.rows.map((t) => ({ ...t, items: itemsByTicket.get(t.id) || [] }));
  }

  async _transitionTicket(tenantId, ticketId, toStatus, userId, { branchId, recall = false } = {}) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const current = await client.query(
        `SELECT * FROM kitchen_tickets WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
        [ticketId, tenantId]
      );
      const ticket = current.rows[0];
      if (!ticket) throw new NotFoundError('Kitchen ticket not found');
      if (branchId && ticket.branch_id !== branchId) {
        throw new NotFoundError('Kitchen ticket not found');
      }

      const fromStatus = ticket.status;
      const toNorm = normalizeTicketStatus(toStatus);
      if (!recall && !canTransitionTicket(fromStatus, toStatus)) {
        throw new ValidationError(`Cannot transition ticket from ${fromStatus} to ${toStatus}`);
      }
      if (recall && !['completed', 'served'].includes(fromStatus)) {
        throw new ValidationError('Only served tickets can be recalled');
      }

      const timestamps = {};
      if (toNorm === 'accepted') timestamps.started_at = null;
      if (toNorm === 'preparing') timestamps.started_at = 'NOW()';
      if (toNorm === 'ready') timestamps.ready_at = 'NOW()';
      if (toNorm === 'served' || toNorm === 'completed') timestamps.completed_at = 'NOW()';
      if (toNorm === 'cancelled') timestamps.cancelled_at = 'NOW()';
      if (recall) {
        timestamps.completed_at = null;
        timestamps.ready_at = 'NOW()';
      }

      const finalStatus = recall ? 'ready' : (toNorm === 'completed' ? 'served' : toNorm);
      const setParts = [`status = $3`];
      const values = [ticketId, tenantId, finalStatus];
      let idx = 4;
      for (const [col, val] of Object.entries(timestamps)) {
        setParts.push(`${col} = ${val === 'NOW()' ? 'NOW()' : `$${idx}`}`);
        if (val !== 'NOW()') { values.push(val); idx += 1; }
      }

      const updated = await client.query(
        `UPDATE kitchen_tickets SET ${setParts.join(', ')}
         WHERE id = $1 AND tenant_id = $2 RETURNING *`,
        values
      );

      const itemStatus = recall ? 'ready' : finalStatus;
      if (['accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled'].includes(itemStatus)) {
        const itemTs = itemStatus === 'preparing' ? ', started_at = NOW()'
          : itemStatus === 'ready' ? ', ready_at = NOW()'
            : (itemStatus === 'served' || itemStatus === 'completed') ? ', completed_at = NOW()' : '';
        await client.query(
          `UPDATE kitchen_ticket_items
           SET status = $3${itemTs}
           WHERE kitchen_ticket_id = $1 AND tenant_id = $2 AND status != 'cancelled'`,
          [ticketId, tenantId, itemStatus === 'completed' ? 'served' : itemStatus]
        );

        const ticketItems = await client.query(
          `SELECT order_item_id FROM kitchen_ticket_items
           WHERE kitchen_ticket_id = $1 AND tenant_id = $2 AND status != 'cancelled'`,
          [ticketId, tenantId]
        );
        await syncOrderItemKitchenStatuses(
          client,
          tenantId,
          ticketItems.rows.map((r) => r.order_item_id),
          itemStatus
        );
      }

      await syncOrderKitchenStatus(client, tenantId, ticket.order_id);
      await client.query('COMMIT');

      const row = updated.rows[0];
      await writeAuditLog(tenantId, userId, recall ? 'kitchen.ticket.recalled' : `kitchen.ticket.${finalStatus}`, ticketId, {
        from: fromStatus,
        to: row.status,
      });

      const eventMap = {
        accepted: 'kitchen.ticket.accepted',
        preparing: 'kitchen.ticket.started',
        ready: 'kitchen.ticket.ready',
        served: 'kitchen.ticket.served',
      };
      const event = recall ? 'kitchen.ticket.recalled' : (eventMap[finalStatus] || `kitchen.ticket.${finalStatus}`);
      emitKitchenEvent(tenantId, ticket.branch_id, event, { id: row.id, ticket_number: row.ticket_number, status: row.status });

      return this.getTicketById(tenantId, ticketId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  acceptTicket(tenantId, ticketId, userId, opts) {
    return this._transitionTicket(tenantId, ticketId, 'accepted', userId, opts);
  }

  startTicket(tenantId, ticketId, userId, opts) {
    return this._transitionTicket(tenantId, ticketId, 'preparing', userId, opts);
  }

  readyTicket(tenantId, ticketId, userId, opts) {
    return this._transitionTicket(tenantId, ticketId, 'ready', userId, opts);
  }

  completeTicket(tenantId, ticketId, userId, opts) {
    return this._transitionTicket(tenantId, ticketId, 'served', userId, opts);
  }

  cancelTicket(tenantId, ticketId, userId, opts) {
    return this._transitionTicket(tenantId, ticketId, 'cancelled', userId, opts);
  }

  recallTicket(tenantId, ticketId, userId, opts) {
    return this._transitionTicket(tenantId, ticketId, 'ready', userId, { ...opts, recall: true });
  }

  async setPriority(tenantId, ticketId, priority, { branchId } = {}) {
    const result = await db.query(
      `UPDATE kitchen_tickets SET priority = $3
       WHERE id = $1 AND tenant_id = $2
         ${branchId ? 'AND branch_id = $4' : ''}
       RETURNING *`,
      branchId ? [ticketId, tenantId, priority, branchId] : [ticketId, tenantId, priority]
    );
    if (!result.rows[0]) throw new NotFoundError('Kitchen ticket not found');
    return this.getTicketById(tenantId, ticketId, { branchId });
  }

  async getKdsMetrics(tenantId, { branch_id: branchId } = {}) {
    const params = [tenantId];
    let branchFilter = '';
    if (branchId) {
      params.push(branchId);
      branchFilter = ` AND branch_id = $${params.length}`;
    }

    const settings = await loadRestaurantKdsSettings(db, tenantId);
    const overdueMinutes = settings.overdue_after_minutes || 15;

    const counts = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('pending', 'preparing', 'ready'))::int AS active,
         COUNT(*) FILTER (WHERE status = 'preparing')::int AS preparing,
         COUNT(*) FILTER (WHERE status = 'ready')::int AS ready,
         COUNT(*) FILTER (WHERE status IN ('pending', 'preparing', 'ready')
           AND created_at < NOW() - ($${params.length + 1} || ' minutes')::interval)::int AS overdue,
         COUNT(*) FILTER (WHERE status = 'served'
           AND completed_at >= CURRENT_DATE)::int AS completed_today
       FROM kitchen_tickets
       WHERE tenant_id = $1${branchFilter}`,
      [...params, String(overdueMinutes)]
    );

    return counts.rows[0];
  }

  async listStations(tenantId, { branch_id: branchId } = {}) {
    const params = [tenantId];
    let where = 'tenant_id = $1';
    if (branchId) {
      params.push(branchId);
      where += ` AND branch_id = $${params.length}`;
    }
    const result = await db.query(
      `SELECT * FROM kitchen_stations WHERE ${where} ORDER BY display_order ASC, name ASC`,
      params
    );
    return result.rows;
  }

  async createStation(tenantId, data) {
    const branch = await db.query(
      'SELECT id FROM branches WHERE id = $1 AND tenant_id = $2',
      [data.branch_id, tenantId]
    );
    if (!branch.rows[0]) throw new NotFoundError('Branch not found');
    const result = await db.query(
      `INSERT INTO kitchen_stations (tenant_id, branch_id, name, description, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, data.branch_id, data.name, data.description || null, data.display_order ?? 0, data.is_active !== false]
    );
    return result.rows[0];
  }

  async updateStation(tenantId, id, data) {
    const existing = await db.query(
      'SELECT id FROM kitchen_stations WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (!existing.rows[0]) throw new NotFoundError('Station not found');
    const result = await db.query(
      `UPDATE kitchen_stations
       SET name = COALESCE($3, name),
           description = COALESCE($4, description),
           display_order = COALESCE($5, display_order),
           is_active = COALESCE($6, is_active)
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId, data.name || null, data.description ?? null,
        data.display_order != null ? data.display_order : null,
        data.is_active != null ? data.is_active : null]
    );
    return result.rows[0];
  }

  async deleteStation(tenantId, id) {
    const result = await db.query(
      'DELETE FROM kitchen_stations WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );
    if (!result.rows[0]) throw new NotFoundError('Station not found');
    return { deleted: true };
  }
}

module.exports = new KitchenService();
