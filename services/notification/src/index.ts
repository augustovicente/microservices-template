import { createApp } from './app';
import { runMigrations } from '@microservices-template/shared';
import { registerSubscriptions } from './subscribers';

async function main() {
  const { app, db, logger, config, publisher, subscriber } = createApp();

  if (db && config.database.migrationsDir) {
    await runMigrations(db, config.database.migrationsDir, logger);
  }

  // Start event subscriptions
  if (subscriber && db) {
    registerSubscriptions(subscriber, db, logger, publisher);
    subscriber.start();
    logger.info('Notification subscriber started');
  }

  const server = app.listen(config.service.port, () => {
    logger.info(`${config.service.name} running on port ${config.service.port}`);
  });

  const shutdown = async () => {
    logger.info('Shutting down…');
    if (subscriber) subscriber.stop();
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
