const cmsService = require('./cms.service');
const { success, created, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

const handler = (type) => ({
  list: asyncHandler(async (req, res) => {
    const result = await cmsService.list(type, req.query);
    return paginated(res, result.rows, result.pagination);
  }),
  getById: asyncHandler(async (req, res) => success(res, await cmsService.getById(type, req.params.id))),
  create: asyncHandler(async (req, res) => created(res, await cmsService.create(type, req.body))),
  update: asyncHandler(async (req, res) => success(res, await cmsService.update(type, req.params.id, req.body))),
  remove: asyncHandler(async (req, res) => {
    await cmsService.remove(type, req.params.id);
    return success(res, null, 'Deleted');
  }),
});

module.exports = {
  pages: handler('pages'),
  blogs: handler('blogs'),
  emailTemplates: handler('email_templates'),
};
