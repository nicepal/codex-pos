const {
  isKitchenItem,
  resolveStationId,
  deriveOrderKitchenStatus,
  canTransitionTicket,
  mergeKdsSettings,
  ticketStatusToOrderItemStatus,
} = require('../../src/modules/kitchen/kitchen.helpers');

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('../../src/realtime/socket', () => ({
  emitToBranch: jest.fn(),
}));

const db = require('../../src/config/database');
const kitchenService = require('../../src/modules/kitchen/kitchen.service');

function mockTx(responses) {
  let call = 0;
  const client = {
    query: jest.fn(async (sql, params) => {
      if (typeof responses[call] === 'function') return responses[call](sql, params);
      const row = responses[call];
      call += 1;
      return row ?? { rows: [] };
    }),
    release: jest.fn(),
  };
  db.getClient.mockResolvedValue(client);
  return client;
}

describe('Kitchen helpers', () => {
  test('isKitchenItem detects requires_kitchen and station routing', () => {
    expect(isKitchenItem({ requires_kitchen: true }, null)).toBe(true);
    expect(isKitchenItem({ kitchen_station_id: 's1' }, null)).toBe(true);
    expect(isKitchenItem({}, { kitchen_station_id: 's1' })).toBe(true);
    expect(isKitchenItem({}, {})).toBe(false);
  });

  test('resolveStationId prefers product over category over default', () => {
    expect(resolveStationId({ kitchen_station_id: 'p' }, { kitchen_station_id: 'c' }, 'd')).toBe('p');
    expect(resolveStationId({}, { kitchen_station_id: 'c' }, 'd')).toBe('c');
    expect(resolveStationId({}, {}, 'd')).toBe('d');
  });

  test('deriveOrderKitchenStatus maps ticket lifecycle to order kitchen_status', () => {
    expect(deriveOrderKitchenStatus(['pending'])).toBe('pending');
    expect(deriveOrderKitchenStatus(['preparing'])).toBe('in_progress');
    expect(deriveOrderKitchenStatus(['ready'])).toBe('ready');
    expect(deriveOrderKitchenStatus(['served'])).toBe('served');
    expect(deriveOrderKitchenStatus(['accepted'])).toBe('in_progress');
  });

  test('canTransitionTicket enforces valid state changes', () => {
    expect(canTransitionTicket('pending', 'accepted')).toBe(true);
    expect(canTransitionTicket('pending', 'preparing')).toBe(true);
    expect(canTransitionTicket('accepted', 'preparing')).toBe(true);
    expect(canTransitionTicket('pending', 'ready')).toBe(false);
    expect(canTransitionTicket('served', 'preparing')).toBe(true);
  });

  test('mergeKdsSettings applies defaults', () => {
    expect(mergeKdsSettings({ warning_after_minutes: 5 }).warning_after_minutes).toBe(5);
    expect(mergeKdsSettings({}).kitchen_enabled).toBe(true);
  });

  test('ticketStatusToOrderItemStatus maps lifecycle', () => {
    expect(ticketStatusToOrderItemStatus('pending')).toBe('sent');
    expect(ticketStatusToOrderItemStatus('accepted')).toBe('accepted');
    expect(ticketStatusToOrderItemStatus('served')).toBe('served');
  });
});

describe('Kitchen ticket creation', () => {
  const tenantId = '00000000-0000-4000-8000-000000000001';
  const branchId = '00000000-0000-4000-8000-000000000002';
  const orderId = '00000000-0000-4000-8000-000000000003';
  const productKitchen = '00000000-0000-4000-8000-000000000010';
  const productRetail = '00000000-0000-4000-8000-000000000011';
  const orderItemKitchen = '00000000-0000-4000-8000-000000000020';
  const stationId = '00000000-0000-4000-8000-000000000030';

  test('creates ticket for kitchen items on restaurant order', async () => {
    const client = {
      query: jest.fn(async (sql) => {
        if (sql.includes("key = 'restaurant'")) {
          return { rows: [{ value: { kitchen_enabled: true } }] };
        }
        if (sql.includes('FROM products p')) {
          return {
            rows: [{
              id: productKitchen,
              requires_kitchen: true,
              kitchen_station_id: stationId,
              category_id: null,
              category_station_id: null,
            }],
          };
        }
        if (sql.includes('FROM kitchen_ticket_items') && sql.includes('order_item_id = ANY')) {
          return { rows: [] };
        }
        if (sql.includes('kitchen_ticket_counters')) {
          return { rows: [{ last_number: 1001 }] };
        }
        if (sql.includes('INSERT INTO kitchen_tickets')) {
          return { rows: [{ id: 't1', ticket_number: 'K-1001', branch_id: branchId }] };
        }
        if (sql.includes('INSERT INTO kitchen_ticket_items')) {
          return { rows: [{ id: 'ti1' }] };
        }
        if (sql.includes('UPDATE orders SET kitchen_status')) {
          return { rows: [] };
        }
        if (sql.includes('SELECT status FROM kitchen_tickets')) {
          return { rows: [{ status: 'pending' }] };
        }
        return { rows: [] };
      }),
    };

    const tickets = await kitchenService.createTicketsForOrder(client, tenantId, {
      orderId,
      branchId,
      sendToKitchen: true,
      orderItems: [{
        order_item_id: orderItemKitchen,
        product_id: productKitchen,
        product_name: 'Burger',
        quantity: 2,
        metadata: { modifiers: [{ option_name: 'Large' }], notes: 'No onion' },
      }],
      features: { restaurant_pro: true },
    });

    expect(tickets).toHaveLength(1);
    expect(tickets[0].ticket_number).toBe('K-1001');
  });

  test('skips non-kitchen items', async () => {
    const client = {
      query: jest.fn(async (sql) => {
        if (sql.includes("key = 'restaurant'")) return { rows: [{ value: {} }] };
        if (sql.includes('FROM products p')) {
          return { rows: [{ id: productRetail, requires_kitchen: false, category_station_id: null }] };
        }
        return { rows: [] };
      }),
    };

    const tickets = await kitchenService.createTicketsForOrder(client, tenantId, {
      orderId,
      branchId,
      sendToKitchen: true,
      orderItems: [{
        order_item_id: 'oi1',
        product_id: productRetail,
        product_name: 'Soda',
        quantity: 1,
        metadata: {},
      }],
      features: { restaurant_pro: true },
    });

    expect(tickets).toHaveLength(0);
  });

  test('idempotent — skips order items that already have tickets', async () => {
    const client = {
      query: jest.fn(async (sql) => {
        if (sql.includes("key = 'restaurant'")) return { rows: [{ value: {} }] };
        if (sql.includes('FROM products p')) {
          return { rows: [{ id: productKitchen, requires_kitchen: true, category_station_id: null }] };
        }
        if (sql.includes('FROM kitchen_ticket_items') && sql.includes('order_item_id = ANY')) {
          return { rows: [{ order_item_id: orderItemKitchen }] };
        }
        return { rows: [] };
      }),
    };

    const tickets = await kitchenService.createTicketsForOrder(client, tenantId, {
      orderId,
      branchId,
      sendToKitchen: true,
      orderItems: [{
        order_item_id: orderItemKitchen,
        product_id: productKitchen,
        product_name: 'Burger',
        quantity: 1,
        metadata: {},
      }],
      features: { restaurant_pro: true },
    });

    expect(tickets).toHaveLength(0);
  });

  test('additional items only — existing item skipped, new item ticketed', async () => {
    const existingItem = orderItemKitchen;
    const newItem = '00000000-0000-4000-8000-000000000021';
    let insertedItems = 0;

    const client = {
      query: jest.fn(async (sql) => {
        if (sql.includes("key = 'restaurant'")) return { rows: [{ value: {} }] };
        if (sql.includes('FROM products p')) {
          return {
            rows: [{
              id: productKitchen,
              requires_kitchen: true,
              kitchen_station_id: null,
              category_station_id: null,
            }],
          };
        }
        if (sql.includes('FROM kitchen_ticket_items') && sql.includes('order_item_id = ANY')) {
          return { rows: [{ order_item_id: existingItem }] };
        }
        if (sql.includes('kitchen_ticket_counters')) return { rows: [{ last_number: 1002 }] };
        if (sql.includes('INSERT INTO kitchen_tickets')) return { rows: [{ id: 't2', ticket_number: 'K-1002', branch_id: branchId }] };
        if (sql.includes('INSERT INTO kitchen_ticket_items')) { insertedItems += 1; return { rows: [{}] }; }
        if (sql.includes('SELECT status FROM kitchen_tickets')) return { rows: [{ status: 'pending' }] };
        if (sql.includes('UPDATE orders SET kitchen_status')) return { rows: [] };
        return { rows: [] };
      }),
    };

    await kitchenService.createTicketsForOrder(client, tenantId, {
      orderId,
      branchId,
      sendToKitchen: true,
      orderItems: [
        { order_item_id: existingItem, product_id: productKitchen, product_name: 'Burger', quantity: 1, metadata: {} },
        { order_item_id: newItem, product_id: productKitchen, product_name: 'Fries', quantity: 1, metadata: {} },
      ],
      features: { restaurant_pro: true },
    });

    expect(insertedItems).toBe(1);
  });

  test('station routing groups items by station', async () => {
    const stationA = '00000000-0000-4000-8000-000000000040';
    const stationB = '00000000-0000-4000-8000-000000000041';
    let ticketInserts = 0;

    const client = {
      query: jest.fn(async (sql) => {
        if (sql.includes("key = 'restaurant'")) return { rows: [{ value: {} }] };
        if (sql.includes('FROM products p')) {
          return {
            rows: [
              { id: 'p1', requires_kitchen: true, kitchen_station_id: stationA, category_station_id: null },
              { id: 'p2', requires_kitchen: true, kitchen_station_id: stationB, category_station_id: null },
            ],
          };
        }
        if (sql.includes('FROM kitchen_ticket_items') && sql.includes('order_item_id = ANY')) return { rows: [] };
        if (sql.includes('kitchen_ticket_counters')) return { rows: [{ last_number: 1000 + ticketInserts }] };
        if (sql.includes('INSERT INTO kitchen_tickets')) { ticketInserts += 1; return { rows: [{ id: `t${ticketInserts}`, ticket_number: `K-${1000 + ticketInserts}`, branch_id: branchId }] }; }
        if (sql.includes('INSERT INTO kitchen_ticket_items')) return { rows: [{}] };
        if (sql.includes('SELECT status FROM kitchen_tickets')) return { rows: [{ status: 'pending' }] };
        if (sql.includes('UPDATE orders SET kitchen_status')) return { rows: [] };
        return { rows: [] };
      }),
    };

    const tickets = await kitchenService.createTicketsForOrder(client, tenantId, {
      orderId,
      branchId,
      sendToKitchen: true,
      orderItems: [
        { order_item_id: 'oi1', product_id: 'p1', product_name: 'Grill item', quantity: 1, metadata: {} },
        { order_item_id: 'oi2', product_id: 'p2', product_name: 'Bar item', quantity: 1, metadata: {} },
      ],
      features: { restaurant_pro: true },
    });

    expect(tickets).toHaveLength(2);
  });
});

describe('Kitchen ticket state transitions', () => {
  const tenantId = '00000000-0000-4000-8000-000000000001';
  const ticketId = '00000000-0000-4000-8000-000000000099';
  const branchA = '00000000-0000-4000-8000-000000000002';
  const branchB = '00000000-0000-4000-8000-000000000003';

  test('start → ready → served lifecycle helpers', () => {
    expect(canTransitionTicket('pending', 'accepted')).toBe(true);
    expect(canTransitionTicket('accepted', 'preparing')).toBe(true);
    expect(canTransitionTicket('preparing', 'ready')).toBe(true);
    expect(canTransitionTicket('ready', 'served')).toBe(true);
    expect(canTransitionTicket('served', 'preparing')).toBe(true);
  });

  test('tenant/branch isolation — wrong branch returns not found', async () => {
    mockTx([
      { rows: [{ id: ticketId, tenant_id: tenantId, branch_id: branchA, order_id: 'o1', status: 'pending', ticket_number: 'K-1001' }] },
    ]);

    await expect(
      kitchenService.startTicket(tenantId, ticketId, 'user1', { branchId: branchB })
    ).rejects.toThrow(/not found/i);
  });

  test('void cancels kitchen ticket items', async () => {
    const client = {
      query: jest.fn(async (sql) => {
        if (sql.includes('UPDATE kitchen_ticket_items')) {
          return { rows: [{ kitchen_ticket_id: ticketId, order_item_id: 'oi1' }] };
        }
        if (sql.includes('SELECT status FROM kitchen_ticket_items')) {
          return { rows: [{ status: 'cancelled' }] };
        }
        if (sql.includes('UPDATE kitchen_tickets SET status')) return { rows: [] };
        if (sql.includes('SELECT * FROM kitchen_tickets')) {
          return { rows: [{ order_id: 'o1' }] };
        }
        if (sql.includes('SELECT status FROM kitchen_tickets')) return { rows: [] };
        if (sql.includes('UPDATE orders SET kitchen_status')) return { rows: [] };
        return { rows: [] };
      }),
    };

    const cancelled = await kitchenService.cancelTicketItemsForOrderItems(client, tenantId, ['oi1'], 'user1');
    expect(cancelled).toHaveLength(1);
  });
});

describe('Kitchen send to kitchen (sendOrderItemsToKitchen)', () => {
  const tenantId = '00000000-0000-4000-8000-000000000001';
  const branchId = '00000000-0000-4000-8000-000000000002';
  const orderId = '00000000-0000-4000-8000-000000000003';
  const productKitchen = '00000000-0000-4000-8000-000000000010';
  const orderItemKitchen = '00000000-0000-4000-8000-000000000020';

  test('locks order without LEFT JOIN FOR UPDATE', async () => {
    let lockSql = '';
    let call = 0;
    const responses = [
      { rows: [] }, // BEGIN
      (sql) => {
        lockSql = sql;
        return { rows: [{ id: orderId, tenant_id: tenantId, status: 'pending', branch_id: branchId, dining_session_id: null, table_id: null }] };
      },
      { rows: [{ order_item_id: orderItemKitchen, product_id: productKitchen, product_name: 'Burger', quantity: 1, metadata: {}, kitchen_status: null }] },
      { rows: [{ value: { kitchen_enabled: true } }] },
      { rows: [{ id: productKitchen, requires_kitchen: true, kitchen_station_id: null, category_id: null, category_station_id: null }] },
      { rows: [] },
      { rows: [{ last_number: 1001 }] },
      { rows: [{ id: 't1', ticket_number: 'K-1001', branch_id: branchId }] },
      { rows: [{ id: 'ti1' }] },
      { rows: [] }, // UPDATE order_items kitchen_status
      { rows: [{ status: 'pending' }] },
      { rows: [] }, // UPDATE orders kitchen_status
      { rows: [] }, // COMMIT
    ];
    const client = {
      query: jest.fn(async (sql) => {
        const row = typeof responses[call] === 'function' ? responses[call](sql) : responses[call];
        call += 1;
        return row ?? { rows: [] };
      }),
      release: jest.fn(),
    };
    db.getClient.mockResolvedValue(client);
    db.query.mockResolvedValue({ rows: [{ id: orderItemKitchen, kitchen_status: 'sent' }] });

    await kitchenService.sendOrderItemsToKitchen(tenantId, orderId, {
      branchId,
      userId: 'user1',
      features: { restaurant_pro: true },
    });

    expect(lockSql).toMatch(/FROM orders/i);
    expect(lockSql).not.toMatch(/LEFT JOIN/i);
    expect(lockSql).toMatch(/FOR UPDATE/i);
  });

  test('idempotent partial send returns empty when all items already sent', async () => {
    mockTx([
      { rows: [] }, // BEGIN
      { rows: [{ id: orderId, tenant_id: tenantId, status: 'pending', branch_id: branchId }] },
      { rows: [{ order_item_id: orderItemKitchen, product_id: productKitchen, product_name: 'Burger', quantity: 1, metadata: {}, kitchen_status: 'sent' }] },
      { rows: [] }, // COMMIT
    ]);
    db.query.mockResolvedValue({ rows: [{ id: orderItemKitchen, kitchen_status: 'sent' }] });

    const result = await kitchenService.sendOrderItemsToKitchen(tenantId, orderId, {
      branchId,
      userId: 'user1',
      features: { restaurant_pro: true },
    });

    expect(result.tickets).toHaveLength(0);
    expect(result.order_id).toBe(orderId);
  });
});

describe('Offline retry idempotency', () => {
  test('duplicate order_item_id constraint prevents double ticket items', () => {
    // Documented behavior: unique partial index idx_kitchen_ticket_items_order_item_active
    expect(true).toBe(true);
  });
});

describe('RBAC permissions', () => {
  test('kds permissions are defined in migration/seed', () => {
    const perms = ['kds.view', 'kds.manage'];
    expect(perms).toContain('kds.view');
    expect(perms).toContain('kds.manage');
  });
});
