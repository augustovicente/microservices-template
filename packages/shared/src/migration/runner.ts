import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { DatabaseClient } from '../database';
import { Logger } from '../logger';

const MIGRATIONS_TABLE = '_migrations';

/**
 * Run versioned SQL migrations.
 *
 * Migration files must live in `migrationsDir`, be named with a sortable
 * prefix (e.g. 001_create_users.sql) and contain plain SQL.
 * Already-executed migrations are tracked in the `_migrations` table.
 */
export async function runMigrations(
  db: DatabaseClient,
  migrationsDir: string,
  logger: Logger,
): Promise<void> {
  // Ensure migrations tracking table exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const dir = resolve(migrationsDir);
  if (!existsSync(dir)) {
    logger.warn(`Migrations directory not found: ${dir}`);
    return;
  }

  // Get all .sql files, sorted by name
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    logger.info('No migration files found');
    return;
  }

  // Get already-executed migrations
  const executed = await db.query<Array<{ name: string }>>(
    `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY id`,
  );
  const executedNames = new Set(executed.map((r: { name: string }) => r.name));

  let ran = 0;
  for (const file of files) {
    if (executedNames.has(file)) {
      continue;
    }

    const sql = readFileSync(resolve(dir, file), 'utf-8');
    logger.info(`Running migration: ${file}`);

    try {
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await db.query(statement);
      }

      await db.query(`INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?)`, [file]);
      ran++;
      logger.info(`Migration completed: ${file}`);
    } catch (err) {
      logger.error({ err }, `Migration failed: ${file}`);
      throw err;
    }
  }

  logger.info(`Migrations finished — ${ran} new, ${files.length - ran} already applied`);
}
