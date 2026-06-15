const db = require('../../config/database');
const BaseRepository = require('../../shared/base.repository');

class UserRepository extends BaseRepository {
  constructor() {
    super('users', false);
  }

  async findByEmail(email, tenantId = null) {
    const normalizedEmail = email.toLowerCase();
    if (tenantId) {
      return this.queryOne(
        'SELECT * FROM users WHERE email = $1 AND tenant_id = $2',
        [normalizedEmail, tenantId]
      );
    }
    return this.queryOne('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
  }

  async findWithRoles(userId) {
    return this.queryOne(
      `SELECT u.*, array_agg(DISTINCT r.name) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );
  }

  async assignRole(userId, roleId, tenantId = null) {
    await db.query(
      `INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [userId, roleId, tenantId]
    );
  }

  async saveRefreshToken(userId, tokenHash, expiresAt, ip, userAgent) {
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, tokenHash, expiresAt, ip, userAgent]
    );
  }

  async findRefreshToken(tokenHash) {
    return this.queryOne(
      `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );
  }

  async revokeRefreshToken(tokenHash) {
    await db.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
      [tokenHash]
    );
  }

  async revokeAllUserTokens(userId) {
    await db.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
  }

  async setPasswordResetToken(userId, token, expires) {
    await this.update(userId, {
      password_reset_token: token,
      password_reset_expires: expires,
    });
  }

  async findByResetToken(token) {
    return this.queryOne(
      `SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
      [token]
    );
  }

  async verifyEmail(userId) {
    await this.update(userId, {
      email_verified_at: new Date(),
      email_verification_token: null,
    });
  }
}

module.exports = new UserRepository();
