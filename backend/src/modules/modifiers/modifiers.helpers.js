const { ValidationError } = require('../../shared/errors');

/**
 * Validate selected modifier option IDs for a product and return priced snapshot.
 * @param {object} client - pg client
 * @param {string} tenantId
 * @param {string} productId
 * @param {string[]} optionIds - selected modifier_option ids
 * @returns {{ snapshot: object[], modifierTotal: number }}
 */
async function resolveModifierSelections(client, tenantId, productId, optionIds = []) {
  const ids = [...new Set((optionIds || []).filter(Boolean))];
  if (!ids.length) {
    const groups = await client.query(
      `SELECT mg.*
       FROM product_modifier_groups pmg
       JOIN modifier_groups mg ON mg.id = pmg.modifier_group_id AND mg.tenant_id = pmg.tenant_id
       WHERE pmg.tenant_id = $1 AND pmg.product_id = $2 AND mg.active = true`,
      [tenantId, productId]
    );
    for (const g of groups.rows) {
      if (g.required || g.min_selections > 0) {
        throw new ValidationError(`Required modifier group "${g.name}" is missing selections`);
      }
    }
    return { snapshot: [], modifierTotal: 0 };
  }

  const optionsRes = await client.query(
    `SELECT mo.*, mg.id AS group_id, mg.name AS group_name, mg.required, mg.min_selections,
            mg.max_selections, mg.active AS group_active
     FROM modifier_options mo
     JOIN modifier_groups mg ON mg.id = mo.modifier_group_id AND mg.tenant_id = mo.tenant_id
     JOIN product_modifier_groups pmg
       ON pmg.modifier_group_id = mg.id AND pmg.tenant_id = mo.tenant_id AND pmg.product_id = $2
     WHERE mo.tenant_id = $1 AND mo.id = ANY($3::uuid[])`,
    [tenantId, productId, ids]
  );

  if (optionsRes.rows.length !== ids.length) {
    throw new ValidationError('One or more modifier options are invalid for this product');
  }

  for (const row of optionsRes.rows) {
    if (!row.active || !row.group_active) {
      throw new ValidationError(`Modifier option "${row.name}" is not available`);
    }
  }

  const byGroup = {};
  for (const row of optionsRes.rows) {
    if (!byGroup[row.group_id]) byGroup[row.group_id] = [];
    byGroup[row.group_id].push(row);
  }

  const assignedGroups = await client.query(
    `SELECT mg.*
     FROM product_modifier_groups pmg
     JOIN modifier_groups mg ON mg.id = pmg.modifier_group_id AND mg.tenant_id = pmg.tenant_id
     WHERE pmg.tenant_id = $1 AND pmg.product_id = $2 AND mg.active = true
     ORDER BY pmg.sort_order ASC, mg.name ASC`,
    [tenantId, productId]
  );

  for (const group of assignedGroups.rows) {
    const selected = byGroup[group.id] || [];
    const count = selected.length;
    if (group.required && count === 0) {
      throw new ValidationError(`Required modifier group "${group.name}" needs a selection`);
    }
    if (count < group.min_selections) {
      throw new ValidationError(`Modifier group "${group.name}" requires at least ${group.min_selections} selection(s)`);
    }
    if (count > group.max_selections) {
      throw new ValidationError(`Modifier group "${group.name}" allows at most ${group.max_selections} selection(s)`);
    }
  }

  const snapshot = optionsRes.rows
    .sort((a, b) => (a.display_order - b.display_order) || a.name.localeCompare(b.name))
    .map((row) => ({
      group_id: row.group_id,
      group_name: row.group_name,
      option_id: row.id,
      option_name: row.name,
      price_delta: parseFloat(row.price_delta),
    }));

  const modifierTotal = snapshot.reduce((sum, s) => sum + s.price_delta, 0);
  return { snapshot, modifierTotal };
}

module.exports = {
  resolveModifierSelections,
};
