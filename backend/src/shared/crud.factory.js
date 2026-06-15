const BaseRepository = require('./base.repository');

function createRepository(tableName, tenantScoped = true) {
  return new BaseRepository(tableName, tenantScoped);
}

function createCrudService(repository, options = {}) {
  const { beforeCreate, afterCreate, searchableFields = [] } = options;

  return {
    async list(tenantId, query = {}) {
      const filters = {};
      if (query.status) filters.status = query.status;
      if (query.category_id) filters.category_id = query.category_id;
      return repository.findAll(tenantId, {
        page: query.page,
        limit: query.limit,
        orderBy: query.sortBy || 'created_at',
        order: query.sortOrder || 'DESC',
        filters,
      });
    },

    async getById(tenantId, id) {
      const record = await repository.findById(id, tenantId);
      if (!record) {
        const { NotFoundError } = require('./errors');
        throw new NotFoundError('Record not found');
      }
      return record;
    },

    async create(tenantId, data) {
      const payload = beforeCreate ? await beforeCreate(data, tenantId) : data;
      const record = await repository.create(payload, tenantId);
      return afterCreate ? afterCreate(record, tenantId) : record;
    },

    async update(tenantId, id, data) {
      return repository.update(id, data, tenantId);
    },

    async remove(tenantId, id) {
      return repository.delete(id, tenantId);
    },

    async bulkRemove(tenantId, ids) {
      const { bulkRemoveByIds } = require('./bulk-delete');
      return bulkRemoveByIds((tid, itemId) => repository.delete(itemId, tid), tenantId, ids);
    },
  };
}

function createCrudController(service, resourceName = 'data') {
  const { asyncHandler } = require('../middleware/errorHandler');
  const { success, created, paginated, noContent } = require('./response');

  return {
    list: asyncHandler(async (req, res) => {
      const result = await service.list(req.tenant?.id, req.query);
      return paginated(res, result.rows, result.pagination);
    }),

    getById: asyncHandler(async (req, res) => {
      const record = await service.getById(req.tenant?.id, req.params.id);
      return success(res, record);
    }),

    create: asyncHandler(async (req, res) => {
      const record = await service.create(req.tenant?.id, req.body);
      return created(res, record, `${resourceName} created`);
    }),

    update: asyncHandler(async (req, res) => {
      const record = await service.update(req.tenant?.id, req.params.id, req.body);
      return success(res, record, `${resourceName} updated`);
    }),

    remove: asyncHandler(async (req, res) => {
      await service.remove(req.tenant?.id, req.params.id);
      return success(res, null, `${resourceName} deleted`);
    }),

    bulkRemove: asyncHandler(async (req, res) => {
      const { parseBulkIds } = require('./bulk-delete');
      const ids = parseBulkIds(req.body);
      const result = await service.bulkRemove(req.tenant?.id, ids);
      return success(res, result, `${result.deleted} ${resourceName}(s) deleted`);
    }),
  };
}

function createCrudRoutes(controller, { authenticate, requireTenant, authorize, auditLog }, permission) {
  const router = require('express').Router();
  router.use(authenticate, requireTenant, authorize(permission));

  router.get('/', controller.list);
  router.post('/bulk-delete', auditLog(`${permission}.delete`), controller.bulkRemove);
  router.get('/:id', controller.getById);
  router.post('/', auditLog(`${permission}.create`), controller.create);
  router.put('/:id', auditLog(`${permission}.update`), controller.update);
  router.delete('/:id', auditLog(`${permission}.delete`), controller.remove);

  return router;
}

module.exports = { createRepository, createCrudService, createCrudController, createCrudRoutes };
