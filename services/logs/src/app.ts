import express from 'express';
import cors from 'cors';
import {
  loadConfig,
  createLogger,
  createDatabaseClient,
  createPrometheusMiddleware,
  createHealthRouter,
  createErrorHandler,
  DatabaseClient,
  Logger,
  ServiceConfig,
} from '@microservices-template/shared';
import { createSaveLogController } from './controllers/save-log.controller';

export interface AppContext {
  app: express.Application;
  db: DatabaseClient | null;
  logger: Logger;
  config: ServiceConfig;
}

export function createApp(overrides?: Partial<AppContext>): AppContext {
  const config = overrides?.config || loadConfig();
  const logger = overrides?.logger || createLogger(config);
  const db = overrides?.db !== undefined ? overrides.db : createDatabaseClient(config, logger);

  const app = express();
  app.use(express.json());

  if (config.features.cors) {
    app.use(cors({ origin: config.cors.origins, methods: config.cors.methods }));
  }

  if (config.features.prometheus) {
    const { middleware, registry } = createPrometheusMiddleware({
      serviceName: config.service.name,
    });
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
    app.post('/logs', createSaveLogController(db, logger));
  }

  // ── Error handler (must be last) ───────────────────────────────────────
  app.use(createErrorHandler(logger));

  return { app, db, logger, config };
}
