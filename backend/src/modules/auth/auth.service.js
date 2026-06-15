const userRepo = require('./auth.repository');
const db = require('../../config/database');
const { hashPassword, comparePassword } = require('../../utils/password');
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  generateSecureToken,
  parseExpiry,
} = require('../../utils/jwt');
const config = require('../../config');
const {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  ValidationError,
  MfaRequiredError,
} = require('../../shared/errors');
const { slugify } = require('../../utils/helpers');

class AuthService {
  async registerBusiness(data) {
    const { businessName, slug, email, password, firstName, lastName, phone, address, timezone, currency } = data;
    const businessSlug = slug || slugify(businessName);

    const existingSlug = await db.query('SELECT id FROM tenants WHERE slug = $1', [businessSlug]);
    if (existingSlug.rows.length) throw new ConflictError('Business slug already taken');

    const existingEmail = await userRepo.findByEmail(email);
    if (existingEmail) throw new ConflictError('Email already registered');

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const tenantResult = await client.query(
        `INSERT INTO tenants (name, slug, email, phone, address, timezone, currency, status, trial_ends_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'trial', NOW() + INTERVAL '14 days')
         RETURNING *`,
        [businessName, businessSlug, email, phone, address, timezone || 'UTC', currency || 'USD']
      );
      const tenant = tenantResult.rows[0];

      await client.query(
        `INSERT INTO tenant_domains (tenant_id, domain, domain_type, is_primary, verification_status)
         VALUES ($1, $2, 'subdomain', true, 'verified')`,
        [tenant.id, `${businessSlug}.${config.app.platformDomain}`]
      );

      const starterPlan = await client.query(`SELECT id FROM plans WHERE slug = 'starter' LIMIT 1`);
      if (starterPlan.rows[0]) {
        await client.query(
          `INSERT INTO subscriptions (tenant_id, plan_id, status, billing_cycle, trial_ends_at, current_period_start, current_period_end)
           VALUES ($1, $2, 'trialing', 'monthly', NOW() + INTERVAL '14 days', NOW(), NOW() + INTERVAL '1 month')`,
          [tenant.id, starterPlan.rows[0].id]
        );
      }

      const passwordHash = await hashPassword(password);
      const userResult = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, phone, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING *`,
        [tenant.id, email.toLowerCase(), passwordHash, firstName, lastName, phone]
      );
      const user = userResult.rows[0];

      const ownerRole = await client.query(`SELECT id FROM roles WHERE name = 'business_owner'`);
      await client.query(
        `INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ($1, $2, $3)`,
        [user.id, ownerRole.rows[0].id, tenant.id]
      );

      await client.query('COMMIT');

      const tokens = await this._generateTokens(user, null, null);

      setImmediate(() => {
        const emailService = require('../../services/email.service');
        emailService.sendWelcomeEmail(user, tenant).catch(() => {});
      });

      return { user: this._sanitizeUser(user), tenant, ...tokens };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async login(email, password, tenantId = null, mfaToken = null, ip, userAgent) {
    const user = await userRepo.findByEmail(email, tenantId);
    if (!user) throw new UnauthorizedError('Invalid credentials');

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    if (user.mfa_enabled) {
      if (!mfaToken) throw new MfaRequiredError();
      const speakeasy = require('speakeasy');
      const mfaValid = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: mfaToken,
        window: 1,
      });
      if (!mfaValid) throw new UnauthorizedError('Invalid MFA code');
    }

    await db.query(
      `UPDATE users SET last_login_at = NOW(), last_login_ip = $1 WHERE id = $2`,
      [ip, user.id]
    );

    const tokens = await this._generateTokens(user, ip, userAgent);
    const userWithRoles = await userRepo.findWithRoles(user.id);

    let tenant = null;
    if (user.tenant_id) {
      tenant = await db.query('SELECT * FROM tenants WHERE id = $1', [user.tenant_id]);
      tenant = tenant.rows[0];
    }

    return {
      user: this._sanitizeUser({ ...userWithRoles, roles: userWithRoles.roles?.filter(Boolean) }),
      tenant,
      ...tokens,
    };
  }

  async refresh(refreshToken, ip, userAgent) {
    const tokenHash = hashToken(refreshToken);
    const stored = await userRepo.findRefreshToken(tokenHash);
    if (!stored) throw new UnauthorizedError('Invalid refresh token');

    await userRepo.revokeRefreshToken(tokenHash);

    const user = await userRepo.findById(stored.user_id);
    if (!user || user.status !== 'active') throw new UnauthorizedError('User inactive');

    return this._generateTokens(user, ip, userAgent);
  }

  async logout(refreshToken) {
    if (refreshToken) {
      await userRepo.revokeRefreshToken(hashToken(refreshToken));
    }
    return true;
  }

  async forgotPassword(email) {
    const user = await userRepo.findByEmail(email);
    if (!user) return { message: 'If email exists, reset link sent' };

    const token = generateSecureToken();
    const expires = new Date(Date.now() + 3600000);
    await userRepo.setPasswordResetToken(user.id, token, expires);

    return { message: 'If email exists, reset link sent', resetToken: config.env === 'development' ? token : undefined };
  }

  async resetPassword(token, newPassword) {
    const user = await userRepo.findByResetToken(token);
    if (!user) throw new ValidationError('Invalid or expired reset token');

    const passwordHash = await hashPassword(newPassword);
    await userRepo.update(user.id, {
      password_hash: passwordHash,
      password_reset_token: null,
      password_reset_expires: null,
    });
    await userRepo.revokeAllUserTokens(user.id);
    return true;
  }

  async impersonate(adminUserId, tenantId, ip) {
    const tenant = await db.query('SELECT * FROM tenants WHERE id = $1 AND status != $2', [tenantId, 'deleted']);
    if (!tenant.rows[0]) throw new NotFoundError('Tenant not found');

    const owner = await db.query(
      `SELECT u.* FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       WHERE u.tenant_id = $1 AND r.name = 'business_owner' LIMIT 1`,
      [tenantId]
    );
    if (!owner.rows[0]) throw new NotFoundError('Business owner not found');

    const user = owner.rows[0];
    await db.query(
      `INSERT INTO impersonation_logs (admin_user_id, target_tenant_id, target_user_id, ip_address) VALUES ($1, $2, $3, $4)`,
      [adminUserId, tenantId, user.id, ip]
    );

    const tokens = await this._generateTokens(user, ip, 'impersonation');
    const userWithRoles = await userRepo.findWithRoles(user.id);

    return {
      user: this._sanitizeUser({ ...userWithRoles, roles: userWithRoles.roles?.filter(Boolean), impersonating: true }),
      tenant: tenant.rows[0],
      ...tokens,
    };
  }

  async setupMfa(userId) {
    const speakeasy = require('speakeasy');
    const user = await userRepo.findById(userId);
    const secret = speakeasy.generateSecret({ name: `EYZPOS:${user?.email || userId}` });
    await userRepo.update(userId, { mfa_secret: secret.base32 });
    return { secret: secret.base32, otpauth: secret.otpauth_url };
  }

  async enableMfa(userId, token) {
    const speakeasy = require('speakeasy');
    const user = await userRepo.findById(userId);
    if (!user?.mfa_secret) throw new ValidationError('MFA not initialized');
    const valid = speakeasy.totp.verify({ secret: user.mfa_secret, encoding: 'base32', token, window: 1 });
    if (!valid) throw new ValidationError('Invalid MFA token');
    await userRepo.update(userId, { mfa_enabled: true });
    return { enabled: true };
  }

  async disableMfa(userId, password, mfaToken) {
    const user = await userRepo.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const validPassword = await comparePassword(password, user.password_hash);
    if (!validPassword) throw new UnauthorizedError('Invalid password');

    if (user.mfa_enabled) {
      if (!mfaToken) throw new ValidationError('MFA token required to disable MFA');
      const speakeasy = require('speakeasy');
      const valid = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: mfaToken,
        window: 1,
      });
      if (!valid) throw new ValidationError('Invalid MFA token');
    }

    await userRepo.update(userId, { mfa_enabled: false, mfa_secret: null });
    return { enabled: false };
  }

  async _generateTokens(user, ip, userAgent) {
    const payload = { userId: user.id, tenantId: user.tenant_id };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const expiresAt = new Date(Date.now() + parseExpiry(config.jwt.refreshExpiry));
    await userRepo.saveRefreshToken(user.id, hashToken(refreshToken), expiresAt, ip, userAgent);

    return { accessToken, refreshToken };
  }

  _sanitizeUser(user) {
    const { password_hash, password_reset_token, mfa_secret, email_verification_token, ...safe } = user;
    return safe;
  }
}

module.exports = new AuthService();
