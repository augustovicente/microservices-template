import { loadConfig, createLogger, createDatabaseClient, runMigrations } from '@microservices-template/shared';

async function migrate() {
  const config = loadConfig();
  const logger = createLogger(config);
  const db = createDatabaseClient(config, logger);

  if (!db) { process.exit(0); }
  if (!config.database.migrationsDir) { process.exit(0); }

  try {
    await runMigrations(db, config.database.migrationsDir, logger);
  } finally {
    await db.close();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
