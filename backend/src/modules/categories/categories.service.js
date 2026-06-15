const BaseRepository = require('../../shared/base.repository');
const db = require('../../config/database');
const { slugify } = require('../../utils/helpers');
const { NotFoundError } = require('../../shared/errors');

class CategoryRepository extends BaseRepository {
  constructor() {
    super('categories');
  }

  async findTree(tenantId) {
    const rows = await this.query(
      `SELECT c.*, p.name AS parent_name
       FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       WHERE c.tenant_id = $1
       ORDER BY c.sort_order, c.name`,
      [tenantId]
    );
    return rows;
  }
}

class CategoryService {
  constructor() {
    this.repo = new CategoryRepository();
  }

  async list(tenantId, query) {
    if (query.tree === 'true') {
      const rows = await this.repo.findTree(tenantId);
      return { rows, pagination: { total: rows.length, page: 1, limit: rows.length, totalPages: 1 } };
    }
    return this.repo.findAll(tenantId, { page: query.page, limit: query.limit });
  }

  async getById(tenantId, id) {
    const cat = await this.repo.findById(id, tenantId);
    if (!cat) throw new NotFoundError('Category not found');
    return cat;
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
    const children = await db.query(
      'SELECT id FROM categories WHERE parent_id = $1 AND tenant_id = $2 LIMIT 1',
      [id, tenantId]
    );
    if (children.rows.length) {
      const { ValidationError } = require('../../shared/errors');
      throw new ValidationError('Cannot delete category with subcategories');
    }
    return this.repo.delete(id, tenantId);
  }

  async bulkRemove(tenantId, ids) {
    const { bulkRemoveByIds } = require('../../shared/bulk-delete');
    return bulkRemoveByIds((tid, itemId) => this.remove(tid, itemId), tenantId, ids);
  }
}

module.exports = new CategoryService();
