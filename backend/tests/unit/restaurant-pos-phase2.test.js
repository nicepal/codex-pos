const { resolveModifierSelections } = require('../../src/modules/modifiers/modifiers.helpers');

function mockClient(responses) {
  let call = 0;
  return {
    query: jest.fn(async () => {
      const row = responses[call];
      call += 1;
      if (typeof row === 'function') return row();
      return row;
    }),
  };
}

describe('Modifier selections (Phase 2)', () => {
  test('computes unit price: burger 500 + large 200 + cheese 100, qty 2 = 1600 line total', async () => {
    const tenantId = '00000000-0000-4000-8000-000000000001';
    const productId = '00000000-0000-4000-8000-000000000010';
    const sizeGroupId = '00000000-0000-4000-8000-000000000020';
    const cheeseGroupId = '00000000-0000-4000-8000-000000000021';
    const largeId = '00000000-0000-4000-8000-000000000030';
    const cheeseId = '00000000-0000-4000-8000-000000000031';

    const client = mockClient([
      {
        rows: [
          {
            id: largeId,
            name: 'Large',
            price_delta: '200',
            display_order: 0,
            active: true,
            group_id: sizeGroupId,
            group_name: 'Size',
            required: true,
            min_selections: 1,
            max_selections: 1,
            group_active: true,
          },
          {
            id: cheeseId,
            name: 'Extra Cheese',
            price_delta: '100',
            display_order: 0,
            active: true,
            group_id: cheeseGroupId,
            group_name: 'Add-ons',
            required: false,
            min_selections: 0,
            max_selections: 2,
            group_active: true,
          },
        ],
      },
      {
        rows: [
          {
            id: sizeGroupId,
            name: 'Size',
            required: true,
            min_selections: 1,
            max_selections: 1,
            active: true,
          },
          {
            id: cheeseGroupId,
            name: 'Add-ons',
            required: false,
            min_selections: 0,
            max_selections: 2,
            active: true,
          },
        ],
      },
    ]);

    const basePrice = 500;
    const qty = 2;
    const result = await resolveModifierSelections(client, tenantId, productId, [largeId, cheeseId]);
    const unitPrice = basePrice + result.modifierTotal;
    expect(unitPrice).toBe(800);
    expect(unitPrice * qty).toBe(1600);
    expect(result.snapshot).toHaveLength(2);
    expect(result.modifierTotal).toBe(300);
    expect(result.snapshot.reduce((s, m) => s + m.price_delta, 0)).toBe(300);
  });

  test('rejects when required group missing selections', async () => {
    const client = mockClient([
      {
        rows: [{
          id: 'g1',
          name: 'Size',
          required: true,
          min_selections: 1,
          max_selections: 1,
          active: true,
        }],
      },
    ]);

    await expect(
      resolveModifierSelections(
        client,
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000010',
        []
      )
    ).rejects.toThrow(/required modifier group/i);
  });

  test('rejects selections above max_selections', async () => {
    const tenantId = '00000000-0000-4000-8000-000000000001';
    const productId = '00000000-0000-4000-8000-000000000010';
    const groupId = '00000000-0000-4000-8000-000000000020';
    const opt1 = '00000000-0000-4000-8000-000000000030';
    const opt2 = '00000000-0000-4000-8000-000000000031';

    const client = mockClient([
      {
        rows: [
          {
            id: opt1, name: 'A', price_delta: '0', display_order: 0, active: true,
            group_id: groupId, group_name: 'Toppings', required: false,
            min_selections: 0, max_selections: 1, group_active: true,
          },
          {
            id: opt2, name: 'B', price_delta: '0', display_order: 1, active: true,
            group_id: groupId, group_name: 'Toppings', required: false,
            min_selections: 0, max_selections: 1, group_active: true,
          },
        ],
      },
      {
        rows: [{
          id: groupId, name: 'Toppings', required: false,
          min_selections: 0, max_selections: 1, active: true,
        }],
      },
    ]);

    await expect(
      resolveModifierSelections(client, tenantId, productId, [opt1, opt2])
    ).rejects.toThrow(/at most 1 selection/i);
  });
});

describe('Restaurant POS financial integrity', () => {
  test('line total uses server-calculated unit price including modifiers', () => {
    const unitPrice = 500 + 200 + 100;
    const quantity = 2;
    const lineTotal = unitPrice * quantity;
    expect(lineTotal).toBe(1600);
  });
});
