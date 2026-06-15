const BaseRepository = require('../../shared/base.repository');
const { slugify } = require('../../utils/helpers');
const { NotFoundError } = require('../../shared/errors');

class BrandService {
  constructor() {
    this.repo = new BaseRepository('brands');
  }

  async list(tenantId, query) {
    return this.repo.findAll(tenantId, { page: query.page, limit: query.limit });
  }

  async getById(tenantId, id) {
    const brand = await this.repo.findById(id, tenantId);
    if (!brand) throw new NotFoundError('Brand not found');
    return brand;
  }

  async create(tenantId, data) {
    return this.repo.create({
      ...data,
      slug: data.slug || slugify(data.name),
      status: data.status || 'active',
    }, tenantId);
  }

  async update(tenantId, id, data) {
    if (data.name && !data.slug) data.slug = slugify(data.name);
    return this.repo.update(id, data, tenantId);
  }

  async remove(tenantId, id) {
    return this.repo.delete(id, tenantId);
  }

  async bulkRemove(tenantId, ids) {
    const { bulkRemoveByIds } = require('../../shared/bulk-delete');
    return bulkRemoveByIds((tid, itemId) => this.remove(tid, itemId), tenantId, ids);
  }
}

module.exports = new BrandService();
