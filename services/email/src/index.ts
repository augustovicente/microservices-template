import { createApp } from './app';

async function main() {
  const { app, logger, config, subscriber } = createApp();

  // Start NSQ consumer
  if (subscriber) {
    await subscriber.start();
    logger.info('NSQ subscriber started');
  }

  const server = app.listen(config.service.port, () => {
    logger.info(`${config.service.name} running on port ${config.service.port}`);
  });

  const shutdown = async () => {
    logger.info('Shutting down…');
    if (subscriber) await subscriber.stop();
    server.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
