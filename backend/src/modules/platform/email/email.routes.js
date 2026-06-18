const router = require('express').Router();
const controller = require('./email.controller');
const { authenticate, requirePlatformAdmin } = require('../../../middleware/auth');
const { validate } = require('../../../middleware/validate');
const { auditLog } = require('../../../middleware/audit');
const { smtpSchema, testSchema, templateSchema, previewSchema, sendTestSchema } = require('./email.validation');

router.use(authenticate, requirePlatformAdmin);

// SMTP configuration
router.get('/smtp', controller.getSmtp);
router.put('/smtp', validate(smtpSchema), auditLog('smtp.update', 'smtp_settings'), controller.updateSmtp);
router.post('/test', validate(testSchema), controller.test);

// Logs + stats
router.get('/logs', controller.listLogs);
router.get('/stats', controller.stats);

// Templates
router.get('/templates', controller.listTemplates);
router.get('/templates/:id', controller.getTemplate);
router.put('/templates/:id', validate(templateSchema), auditLog('email_template.update', 'email_template'), controller.updateTemplate);
router.post('/templates/:id/preview', validate(previewSchema), controller.previewTemplate);

// Send a test (templated or plain)
router.post('/send-test', validate(sendTestSchema), controller.sendTest);

module.exports = router;
