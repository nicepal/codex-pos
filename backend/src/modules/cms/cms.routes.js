const router = require('express').Router();
const ctrl = require('./cms.controller');
const { authenticate, requirePlatformAdmin } = require('../../middleware/auth');

router.use(authenticate, requirePlatformAdmin);

router.get('/pages', ctrl.pages.list);
router.get('/pages/:id', ctrl.pages.getById);
router.post('/pages', ctrl.pages.create);
router.put('/pages/:id', ctrl.pages.update);
router.delete('/pages/:id', ctrl.pages.remove);

router.get('/blogs', ctrl.blogs.list);
router.get('/blogs/:id', ctrl.blogs.getById);
router.post('/blogs', ctrl.blogs.create);
router.put('/blogs/:id', ctrl.blogs.update);
router.delete('/blogs/:id', ctrl.blogs.remove);

router.get('/email-templates', ctrl.emailTemplates.list);
router.get('/email-templates/:id', ctrl.emailTemplates.getById);
router.post('/email-templates', ctrl.emailTemplates.create);
router.put('/email-templates/:id', ctrl.emailTemplates.update);
router.delete('/email-templates/:id', ctrl.emailTemplates.remove);

module.exports = router;
