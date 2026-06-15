const db = require('../../config/database');
const { NotFoundError } = require('../../shared/errors');
const { slugify } = require('../../utils/helpers');

const tables = {
  pages: { slugField: 'slug', titleField: 'title' },
  blogs: { slugField: 'slug', titleField: 'title' },
  email_templates: { slugField: 'slug', titleField: 'name' },
};

class CmsService {
  async list(type, query) {
    const table = type;
    if (!tables[table]) throw new NotFoundError('Invalid CMS type');
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 50;
    const offset = (page - 1) * limit;
    const count = await db.query(`SELECT COUNT(*)::int AS total FROM ${table}`);
    const rows = await db.query(`SELECT * FROM ${table} ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    const total = count.rows[0].total;
    return { rows: rows.rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getById(type, id) {
    const result = await db.query(`SELECT * FROM ${type} WHERE id = $1`, [id]);
    if (!result.rows[0]) throw new NotFoundError('Record not found');
    return result.rows[0];
  }

  async create(type, data) {
    if (type === 'pages') {
      const r = await db.query(
        `INSERT INTO pages (title, slug, content, meta_title, meta_description, status, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [data.title, data.slug || slugify(data.title), data.content, data.meta_title, data.meta_description, data.status || 'draft', data.status === 'published' ? new Date() : null]
      );
      return r.rows[0];
    }
    if (type === 'blogs') {
      const r = await db.query(
        `INSERT INTO blogs (title, slug, excerpt, content, author_id, status, published_at, meta_title, meta_description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [data.title, data.slug || slugify(data.title), data.excerpt, data.content, data.author_id, data.status || 'draft', data.status === 'published' ? new Date() : null, data.meta_title, data.meta_description]
      );
      return r.rows[0];
    }
    if (type === 'email_templates') {
      const r = await db.query(
        `INSERT INTO email_templates (slug, name, subject, body_html, variables, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [data.slug || slugify(data.name), data.name, data.subject, data.body_html, JSON.stringify(data.variables || []), data.status || 'active']
      );
      return r.rows[0];
    }
    throw new NotFoundError('Invalid CMS type');
  }

  async update(type, id, data) {
    await this.getById(type, id);
    if (type === 'pages') {
      const r = await db.query(
        `UPDATE pages SET title=$1, slug=$2, content=$3, meta_title=$4, meta_description=$5, status=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
        [data.title, data.slug, data.content, data.meta_title, data.meta_description, data.status, id]
      );
      return r.rows[0];
    }
    if (type === 'blogs') {
      const r = await db.query(
        `UPDATE blogs SET title=$1, slug=$2, excerpt=$3, content=$4, author_id=$5, status=$6, meta_title=$7, meta_description=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
        [data.title, data.slug, data.excerpt, data.content, data.author_id, data.status, data.meta_title, data.meta_description, id]
      );
      return r.rows[0];
    }
    if (type === 'email_templates') {
      const r = await db.query(
        `UPDATE email_templates SET name=$1, subject=$2, body_html=$3, variables=$4, status=$5, updated_at=NOW() WHERE id=$6 RETURNING *`,
        [data.name, data.subject, data.body_html, JSON.stringify(data.variables || []), data.status, id]
      );
      return r.rows[0];
    }
    throw new NotFoundError('Invalid CMS type');
  }

  async remove(type, id) {
    await this.getById(type, id);
    await db.query(`DELETE FROM ${type} WHERE id = $1`, [id]);
    return true;
  }
}

module.exports = new CmsService();
