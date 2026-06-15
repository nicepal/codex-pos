const authService = require('./auth.service');
const { success, created } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

class AuthController {
  register = asyncHandler(async (req, res) => {
    const result = await authService.registerBusiness(req.body);
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
    return success(res, result, 'Login successful');
  });

  refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const tokens = await authService.refresh(refreshToken, req.ip, req.headers['user-agent']);
    return success(res, tokens, 'Token refreshed');
  });

  logout = asyncHandler(async (req, res) => {
    await authService.logout(req.body.refreshToken);
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
    if (user.tenant_id) {
      const db = require('../../config/database');
      const result = await db.query(
        'SELECT id, name, slug, status, currency, timezone FROM tenants WHERE id = $1',
        [user.tenant_id]
      );
      tenant = result.rows[0] || null;
    }
    return success(res, { user, tenant });
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
}

module.exports = new AuthController();
