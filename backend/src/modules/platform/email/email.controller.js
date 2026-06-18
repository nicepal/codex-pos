const { asyncHandler } = require('../../../middleware/errorHandler');
const { success } = require('../../../shared/response');
const smtpService = require('./smtp.service');
const adminService = require('./email.admin.service');
const emailService = require('../../../services/email.service');

module.exports = {
  // SMTP config
  getSmtp: asyncHandler(async (req, res) =>
    success(res, await smtpService.getMaskedConfig())),

  updateSmtp: asyncHandler(async (req, res) =>
    success(res, await smtpService.saveConfig(req.body), 'SMTP settings saved')),

  // Verify connection / send a probe test email (optionally with inline config)
  test: asyncHandler(async (req, res) => {
    const { test_email: testEmail, ...rest } = req.body;
    const hasInline = rest.host && rest.from_email;
    const result = await emailService.sendTestEmail(testEmail, hasInline ? rest : null);
    return success(res, result, result.success ? 'Test email sent' : 'Test failed');
  }),

  // Logs
  listLogs: asyncHandler(async (req, res) => {
    const { items, pagination } = await adminService.listLogs(req.query);
    return res.status(200).json({ success: true, message: 'Success', data: items, pagination });
  }),

  // Stats for dashboard widget
  stats: asyncHandler(async (req, res) =>
    success(res, await adminService.getStats())),

  // Templates
  listTemplates: asyncHandler(async (req, res) =>
    success(res, await adminService.listTemplates())),

  getTemplate: asyncHandler(async (req, res) =>
    success(res, await adminService.getTemplate(req.params.id))),

  updateTemplate: asyncHandler(async (req, res) =>
    success(res, await adminService.updateTemplate(req.params.id, req.body), 'Template updated')),

  previewTemplate: asyncHandler(async (req, res) =>
    success(res, await adminService.previewTemplate(req.params.id, req.body.variables))),

  // Send a real templated test email (renders template + delivers)
  sendTest: asyncHandler(async (req, res) => {
    const { test_email: testEmail, slug, variables } = req.body;
    if (slug) {
      const vars = { ...adminService.sampleVars, ...(variables || {}) };
      const result = await emailService.sendTemplate(slug, testEmail, vars, { tenantId: null });
      return success(res, result, 'Test email queued');
    }
    const result = await emailService.sendTestEmail(testEmail);
    return success(res, result, result.success ? 'Test email sent' : 'Test failed');
  }),
};
