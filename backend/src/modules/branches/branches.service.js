const BaseRepository = require('../../shared/base.repository');
const { NotFoundError } = require('../../shared/errors');
const { checkLimit } = require('../../shared/plan-limits');

class BranchRepository extends BaseRepository {
  constructor() {
    super('branches');
  }
}

class BranchService {
  constructor() {
    this.repo = new BranchRepository();
  }

  async list(tenantId, query) {
    return this.repo.findAll(tenantId, { page: query.page, limit: query.limit });
  }

  async getById(tenantId, id) {
    const branch = await this.repo.findById(id, tenantId);
    if (!branch) throw new NotFoundError('Branch not found');
    return branch;
  }

  async create(tenantId, data) {
    await checkLimit(tenantId, 'branches');
    if (data.is_primary) {
      await this.repo.query('UPDATE branches SET is_primary = false WHERE tenant_id = $1', [tenantId]);
    }
    return this.repo.create({ ...data, status: 'active' }, tenantId);
  }

  async update(tenantId, id, data) {
    if (data.is_primary) {
      await this.repo.query('UPDATE branches SET is_primary = false WHERE tenant_id = $1', [tenantId]);
    }
    return this.repo.update(id, data, tenantId);
  }

  async remove(tenantId, id) {
    return this.repo.delete(id, tenantId);
  }
}

module.exports = new BranchService();
