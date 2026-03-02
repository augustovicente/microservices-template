import { createApp } from './app';
import { runMigrations } from '@microservices-template/shared';

async function main() {
  const { app, db, logger, config } = createApp();

  // Run pending database migrations
  if (db && config.database.migrationsDir) {
    await runMigrations(db, config.database.migrationsDir, logger);
  }

  const server = app.listen(config.service.port, () => {
    logger.info(`${config.service.name} running on port ${config.service.port}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    server.close();
    if (db) await db.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});