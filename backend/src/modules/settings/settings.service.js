const db = require('../../config/database');
const { NotFoundError } = require('../../shared/errors');

class SettingsService {
  async getBusinessSettings(tenantId) {
    const tenant = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (!tenant.rows[0]) throw new NotFoundError('Business not found');

    const settings = await db.query(
      'SELECT key, value FROM settings WHERE tenant_id = $1',
      [tenantId]
    );

    const settingsMap = Object.fromEntries(
      settings.rows.map((r) => {
        let value = r.value;
        if (typeof value === 'string') {
          try {
            value = JSON.parse(value);
          } catch {
            // keep raw string
          }
        }
        return [r.key, value];
      })
    );

    const checkoutService = require('../storefront/storefront.checkout.service');
    const themeData = await checkoutService.getTheme(tenantId);

    return {
      profile: {
        name: tenant.rows[0].name,
        slug: tenant.rows[0].slug,
        email: tenant.rows[0].email,
        phone: tenant.rows[0].phone,
        address: tenant.rows[0].address,
        city: tenant.rows[0].city,
        state: tenant.rows[0].state,
        country: tenant.rows[0].country,
        postal_code: tenant.rows[0].postal_code,
        timezone: tenant.rows[0].timezone,
        currency: tenant.rows[0].currency,
        logo_url: tenant.rows[0].logo_url,
      },
      preferences: settingsMap,
      storefront_theme: themeData.theme || {},
    };
  }

  async updateBusinessSettings(tenantId, data) {
    const { profile = {}, preferences = {}, storefront_theme = null } = data;

    if (Object.keys(profile).length) {
      const fields = ['name', 'email', 'phone', 'address', 'city', 'state', 'country', 'postal_code', 'timezone', 'currency', 'logo_url'];
      const updates = {};
      for (const f of fields) {
        if (profile[f] !== undefined) updates[f] = profile[f];
      }
      if (Object.keys(updates).length) {
        const keys = Object.keys(updates);
        const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
        await db.query(
          `UPDATE tenants SET ${setClause} WHERE id = $1`,
          [tenantId, ...keys.map((k) => updates[k])]
        );
      }
    }

    for (const [key, value] of Object.entries(preferences)) {
      await db.query(
        `INSERT INTO settings (tenant_id, key, value)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [tenantId, key, JSON.stringify(value)]
      );
    }

    if (storefront_theme) {
      const checkoutService = require('../storefront/storefront.checkout.service');
      await checkoutService.updateTheme(tenantId, storefront_theme);
    }

    return this.getBusinessSettings(tenantId);
  }
}

module.exports = new SettingsService();
