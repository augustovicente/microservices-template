import express from 'express';
import cors from 'cors';
import {
  loadConfig,
  createLogger,
  createDatabaseClient,
  createPrometheusMiddleware,
  createHealthRouter,
  createErrorHandler,
  NsqPublisher,
  NsqSubscriber,
  DatabaseClient,
  Logger,
  ServiceConfig,
} from '@microservices-template/shared';

export interface AppContext {
  app: express.Application;
  db: DatabaseClient | null;
  logger: Logger;
  config: ServiceConfig;
  publisher?: NsqPublisher;
  subscriber?: NsqSubscriber;
}

export function createApp(overrides?: Partial<AppContext>): AppContext {
  const config = overrides?.config || loadConfig();
  const logger = overrides?.logger || createLogger(config);
  const db = overrides?.db !== undefined ? overrides.db : createDatabaseClient(config, logger);

  let publisher = overrides?.publisher;
  let subscriber = overrides?.subscriber;

  if (config.messaging?.enabled && !publisher) {
    publisher = new NsqPublisher(config, logger);
  }
  if (config.messaging?.enabled && !subscriber) {
    subscriber = new NsqSubscriber(config, logger);
  }

  const app = express();
  app.use(express.json());

  if (config.features.cors) {
    app.use(cors({ origin: config.cors.origins, methods: config.cors.methods }));
  }

  if (config.features.prometheus) {
    const { middleware, registry } = createPrometheusMiddleware({ serviceName: config.service.name });
    app.use(middleware);
    app.get('/metrics', async (_req, res) => {
      res.set('Content-Type', 'text/plain');
      res.send(await registry.metrics());
    });
  }

  if (config.features.healthCheck) {
    app.use(createHealthRouter({ db, logger }));
  }

  // ── Routes ──────────────────────────────────────────────────────────────
  app.get('/ping', (_req, res) => res.send('pong'));

  if (db) {
    // GET /notifications?userId=X&unreadOnly=true&page=1&limit=20
    app.get('/notifications', async (req, res) => {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: 'userId query param required' });

      const unreadOnly = req.query.unreadOnly === 'true';
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      try {
        const where = unreadOnly
          ? 'WHERE user_id = ? AND is_read = FALSE'
          : 'WHERE user_id = ?';

        const rows = await db.query(
          `SELECT id, type, title, body, channel, is_read, metadata, created_at FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          [userId, limit, offset],
        );

        res.json({ page, limit, data: rows });
      } catch (err) {
        logger.error({ err }, 'List notifications failed');
        res.status(500).json({ error: 'Failed to list notifications' });
      }
    });

    // PATCH /notifications/:id/read
    app.patch('/notifications/:id/read', async (req, res) => {
      try {
        await db.execute('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
        res.json({ message: 'Marked as read' });
      } catch (err) {
        logger.error({ err }, 'Mark read failed');
        res.status(500).json({ error: 'Failed to mark notification as read' });
      }
    });

    // POST /notifications/:userId/read-all
    app.post('/notifications/:userId/read-all', async (req, res) => {
      try {
        await db.execute('UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE', [req.params.userId]);
        res.json({ message: 'All marked as read' });
      } catch (err) {
        logger.error({ err }, 'Mark all read failed');
        res.status(500).json({ error: 'Failed to mark all as read' });
      }
    });
  }

  app.use(createErrorHandler(logger));

  return { app, db, logger, config, publisher, subscriber };
}
