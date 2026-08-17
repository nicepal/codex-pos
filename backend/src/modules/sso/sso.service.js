const db = require('../../config/database');
const crypto = require('crypto');
const config = require('../../config');
const { encrypt, decrypt, mask } = require('../../utils/crypto');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const bcrypt = require('bcryptjs');

/**
 * Tenant SSO (OIDC-ready). Secrets are stored AES-GCM encrypted.
 * Callback currently trusts an email claim stub — wire a real IdP token
 * exchange before production use.
 */
class SsoService {
  async getConfig(tenantId) {
    const result = await db.query(
      `SELECT * FROM sso_configs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [tenantId]
    );
    const row = result.rows[0];
    if (!row) return null;
    return this._sanitize(row);
  }

  async upsertConfig(tenantId, data) {
    const existing = await db.query(
      `SELECT id FROM sso_configs WHERE tenant_id = $1 LIMIT 1`,
      [tenantId]
    );

    let secretEncrypted = null;
    if (data.client_secret) {
      secretEncrypted = encrypt(data.client_secret);
    }

    if (existing.rows[0]) {
      const result = await db.query(
        `UPDATE sso_configs SET
           provider = COALESCE($3, provider),
           client_id = COALESCE($4, client_id),
           client_secret_encrypted = COALESCE($5, client_secret_encrypted),
           issuer_url = COALESCE($6, issuer_url),
           authorization_url = COALESCE($7, authorization_url),
           token_url = COALESCE($8, token_url),
           jwks_url = COALESCE($9, jwks_url),
           scopes = COALESCE($10, scopes),
           is_enabled = COALESCE($11, is_enabled),
           updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2 RETURNING *`,
        [
          existing.rows[0].id,
          tenantId,
          data.provider || null,
          data.client_id || null,
          secretEncrypted,
          data.issuer_url || null,
          data.authorization_url || null,
          data.token_url || null,
          data.jwks_url || null,
          data.scopes || null,
          data.is_enabled != null ? Boolean(data.is_enabled) : null,
        ]
      );
      return this._sanitize(result.rows[0]);
    }

    const result = await db.query(
      `INSERT INTO sso_configs
         (tenant_id, provider, client_id, client_secret_encrypted, issuer_url,
          authorization_url, token_url, jwks_url, scopes, is_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        tenantId,
        data.provider || 'oidc',
        data.client_id || null,
        secretEncrypted,
        data.issuer_url || null,
        data.authorization_url || null,
        data.token_url || null,
        data.jwks_url || null,
        data.scopes || 'openid profile email',
        data.is_enabled != null ? Boolean(data.is_enabled) : false,
      ]
    );
    return this._sanitize(result.rows[0]);
  }

  async buildAuthorizeUrl(tenantId, { redirect_uri, state } = {}) {
    const cfg = await this._rawConfig(tenantId);
    if (!cfg || !cfg.is_enabled) throw new ValidationError('SSO is not enabled for this tenant');
    if (!cfg.authorization_url || !cfg.client_id) {
      throw new ValidationError('SSO authorization_url and client_id are required');
    }
    const redirect = redirect_uri || `${config.app.url}/auth/sso/callback`;
    const params = new URLSearchParams({
      client_id: cfg.client_id,
      response_type: 'code',
      scope: cfg.scopes || 'openid profile email',
      redirect_uri: redirect,
      state: state || crypto.randomBytes(12).toString('hex'),
    });
    const base = cfg.authorization_url.includes('?')
      ? `${cfg.authorization_url}&`
      : `${cfg.authorization_url}?`;
    return { url: `${base}${params.toString()}`, state: params.get('state') };
  }

  async handleCallback(tenantId, data = {}) {
    const cfg = await this._rawConfig(tenantId);
    if (!cfg || !cfg.is_enabled) throw new ValidationError('SSO is not enabled for this tenant');

    let email = '';
    const allowStub = process.env.ALLOW_SSO_STUB === 'true' && process.env.NODE_ENV !== 'production';

    if (data.id_token || data.access_token) {
      const token = data.id_token || data.access_token;
      if (!cfg.jwks_url && !allowStub) {
        throw new ValidationError(
          'SSO token verification requires jwks_url. Configure OIDC JWKS before accepting tokens.'
        );
      }
      try {
        const payload = cfg.jwks_url && !allowStub
          ? await this._verifyIdToken(token, cfg)
          : JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString('utf8'));
        email = String(payload.email || payload.preferred_username || '').trim().toLowerCase();
      } catch (err) {
        if (err instanceof ValidationError) throw err;
        throw new ValidationError('Invalid SSO token');
      }
    } else if (allowStub) {
      email = (data.email || data.claims?.email || '').trim().toLowerCase();
    } else {
      throw new ValidationError(
        'SSO stub email claims are disabled. Exchange an authorization code for id_token/access_token at the IdP, or set ALLOW_SSO_STUB=true in non-production.'
      );
    }

    if (!email) throw new ValidationError('email claim is required');

    const user = await db.query(
      `SELECT id, email, first_name, last_name, tenant_id, status FROM users
       WHERE LOWER(email) = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
       ORDER BY CASE WHEN tenant_id = $2 THEN 0 ELSE 1 END LIMIT 1`,
      [email, tenantId]
    );

    if (!user.rows[0]) {
      throw new ValidationError(
        'No existing user for this SSO email. Auto-provisioning from unverified claims is disabled.'
      );
    }
    if (user.rows[0].status !== 'active') {
      throw new ValidationError('User account is not active');
    }

    return {
      user: user.rows[0],
      message: allowStub
        ? 'SSO stub demo: matched existing user (do not use in production)'
        : 'SSO user matched',
    };
  }

  async listScimUsers(tenantId, query = {}) {
    const page = parseInt(query.startIndex, 10) || 1;
    const limit = Math.min(parseInt(query.count, 10) || 50, 100);
    const offset = Math.max(0, page - 1);
    const count = await db.query(
      `SELECT COUNT(*)::int AS total FROM users WHERE tenant_id = $1`,
      [tenantId]
    );
    const rows = await db.query(
      `SELECT id, email, first_name, last_name, status, created_at
       FROM users WHERE tenant_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );
    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: count.rows[0].total,
      startIndex: page,
      itemsPerPage: limit,
      Resources: rows.rows.map((u) => this._toScimUser(u)),
    };
  }

  async createScimUser(tenantId, data = {}) {
    const email = (data.userName || data.emails?.[0]?.value || data.email || '').trim().toLowerCase();
    if (!email) throw new ValidationError('userName (email) is required');
    const existing = await db.query(
      `SELECT id FROM users WHERE LOWER(email) = $1 AND tenant_id = $2`,
      [email, tenantId]
    );
    if (existing.rows[0]) throw new ValidationError('User already exists');

    const hash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
    const result = await db.query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, status)
       VALUES ($1, $2, $3, $4, $5, 'active') RETURNING id, email, first_name, last_name, status, created_at`,
      [
        tenantId,
        email,
        hash,
        data.name?.givenName || data.first_name || 'SCIM',
        data.name?.familyName || data.last_name || 'User',
      ]
    );
    return this._toScimUser(result.rows[0]);
  }

  async _rawConfig(tenantId) {
    const result = await db.query(
      `SELECT * FROM sso_configs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [tenantId]
    );
    return result.rows[0] || null;
  }

  _sanitize(row) {
    if (!row) return null;
    let hasSecret = false;
    let masked = null;
    if (row.client_secret_encrypted) {
      try {
        const plain = decrypt(row.client_secret_encrypted);
        hasSecret = Boolean(plain);
        masked = mask(plain);
      } catch (_) {
        hasSecret = true;
        masked = '****';
      }
    }
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      provider: row.provider,
      client_id: row.client_id,
      client_secret_masked: masked,
      has_client_secret: hasSecret,
      issuer_url: row.issuer_url,
      authorization_url: row.authorization_url,
      token_url: row.token_url,
      jwks_url: row.jwks_url,
      scopes: row.scopes,
      is_enabled: row.is_enabled,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  _toScimUser(u) {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: u.id,
      userName: u.email,
      name: { givenName: u.first_name, familyName: u.last_name },
      emails: [{ value: u.email, primary: true }],
      active: u.status === 'active',
      meta: { resourceType: 'User', created: u.created_at },
    };
  }

  async _verifyIdToken(token, cfg) {
    const jwt = require('jsonwebtoken');
    const { createPublicKey } = require('crypto');
    const parts = String(token).split('.');
    if (parts.length < 2) throw new ValidationError('Invalid SSO token');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const res = await fetch(cfg.jwks_url);
    if (!res.ok) throw new ValidationError('Failed to fetch JWKS');
    const { keys } = await res.json();
    const jwk = keys.find((k) => k.kid === header.kid) || keys[0];
    if (!jwk) throw new ValidationError('JWKS key not found');
    const pem = createPublicKey({ key: jwk, format: 'jwk' }).export({ type: 'spki', format: 'pem' });
    return jwt.verify(token, pem, {
      algorithms: ['RS256', 'ES256'],
      issuer: cfg.issuer_url || undefined,
    });
  }
}

module.exports = new SsoService();
