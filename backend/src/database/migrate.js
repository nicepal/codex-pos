const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const logger = require('../utils/logger');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getExecutedMigrations() {
  const result = await db.query('SELECT filename FROM schema_migrations ORDER BY id');
  return new Set(result.rows.map((r) => r.filename));
}

async function runMigration(filename, sql) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    logger.info(`Migration executed: ${filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function migrate() {
  await ensureMigrationsTable();
  const executed = await getExecutedMigrations();
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (executed.has(file)) {
      logger.info(`Migration skipped (already executed): ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    await runMigration(file, sql);
  }
  logger.info('All migrations completed');
}

async function rollback() {
  const result = await db.query(
    'SELECT filename FROM schema_migrations ORDER BY id DESC LIMIT 1'
  );
  if (!result.rows.length) {
    logger.info('No migrations to rollback');
    return;
  }
  logger.warn('Rollback removes migration record only. Manual SQL rollback required for:', result.rows[0].filename);
  await db.query('DELETE FROM schema_migrations WHERE filename = $1', [result.rows[0].filename]);
}

if (require.main === module) {
  const command = process.argv[2];
  (command === 'rollback' ? rollback() : migrate())
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Migration failed', { error: err.message, stack: err.stack });
      process.exit(1);
    });
}

module.exports = { migrate, rollback };
