const authService = require('./auth.service');
const { success, created } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');
const { ValidationError } = require('../../shared/errors');
const config = require('../../config');

function setRefreshCookie(res, refreshToken) {
  if (!config.jwt.cookieMode || !refreshToken) return;
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: `${config.apiPrefix}/auth`,
  });
}

function clearRefreshCookie(res) {
  if (!config.jwt.cookieMode) return;
  res.clearCookie('refresh_token', { path: `${config.apiPrefix}/auth` });
}

class AuthController {
  register = asyncHandler(async (req, res) => {
    const result = await authService.registerBusiness(req.body);
    setRefreshCookie(res, result.refreshToken);
    return created(res, result, 'Business registered successfully');
  });

  login = asyncHandler(async (req, res) => {
    const { email, password, tenantId, mfaToken } = req.body;
    const result = await authService.login(
      email,
      password,
      tenantId,
      mfaToken,
      req.ip,
      req.headers['user-agent']
    );
    setRefreshCookie(res, result.refreshToken);
    return success(res, result, 'Login successful');
  });

  refresh = asyncHandler(async (req, res) => {
    const refreshToken = req.body.refreshToken || req.cookies?.refresh_token;
    const tokens = await authService.refresh(refreshToken, req.ip, req.headers['user-agent']);
    setRefreshCookie(res, tokens.refreshToken);
    return success(res, tokens, 'Token refreshed');
  });

  logout = asyncHandler(async (req, res) => {
    const refreshToken = req.body.refreshToken || req.cookies?.refresh_token;
    await authService.logout(refreshToken);
    clearRefreshCookie(res);
    return success(res, null, 'Logged out successfully');
  });

  forgotPassword = asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email);
    return success(res, result);
  });

  resetPassword = asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.password);
    return success(res, null, 'Password reset successful');
  });

  me = asyncHandler(async (req, res) => {
    const { password_hash, ...user } = req.user;
    let tenant = null;
    let onboardingRequired = false;
    if (user.tenant_id) {
      const db = require('../../config/database');
      const result = await db.query(
        `SELECT id, name, slug, status, currency, timezone, logo_url, business_type, onboarding_status
         FROM tenants WHERE id = $1`,
        [user.tenant_id]
      );
      tenant = result.rows[0] || null;
      if (tenant) {
        const status = tenant.onboarding_status;
        onboardingRequired = status === 'not_started' || status === 'in_progress' || status === 'failed';
        tenant.onboarding_status = status || 'completed';
      }
    }
    return success(res, { user, tenant, onboarding_required: onboardingRequired });
  });

  impersonate = asyncHandler(async (req, res) => {
    const result = await authService.impersonate(req.user.id, req.body.tenant_id, req.ip);
    return success(res, result, 'Impersonation started');
  });

  setupMfa = asyncHandler(async (req, res) => {
    const result = await authService.setupMfa(req.user.id);
    return success(res, result);
  });

  enableMfa = asyncHandler(async (req, res) => {
    const result = await authService.enableMfa(req.user.id, req.body.token);
    return success(res, result);
  });

  disableMfa = asyncHandler(async (req, res) => {
    const result = await authService.disableMfa(req.user.id, req.body.password, req.body.token);
    return success(res, result);
  });

  pinLogin = asyncHandler(async (req, res) => {
    const { employee_id: employeeId, pin, tenant_id: tenantId, tenant_slug: tenantSlug } = req.body;
    let resolvedTenantId = tenantId;
    if (!resolvedTenantId && tenantSlug) {
      const db = require('../../config/database');
      const t = await db.query('SELECT id FROM tenants WHERE slug = $1', [tenantSlug]);
      resolvedTenantId = t.rows[0]?.id;
    }
    if (!resolvedTenantId) throw new ValidationError('tenant_id or tenant_slug required');
    const result = await authService.pinLogin(
      employeeId,
      pin,
      resolvedTenantId,
      req.ip,
      req.get('user-agent')
    );
    return success(res, result, 'PIN login successful');
  });
}

module.exports = new AuthController();
