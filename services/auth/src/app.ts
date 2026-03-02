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
  DatabaseClient,
  Logger,
  ServiceConfig,
} from '@microservices-template/shared';
import { createRegisterController } from './controllers/register.controller';
import { createLoginController } from './controllers/login.controller';
import { createRefreshController } from './controllers/refresh.controller';
import { createForgotPasswordController } from './controllers/forgot-password.controller';
import { createMeController } from './controllers/me.controller';

export interface AppContext {
  app: express.Application;
  db: DatabaseClient | null;
  logger: Logger;
  config: ServiceConfig;
  publisher?: NsqPublisher;
}

export function createApp(overrides?: Partial<AppContext>): AppContext {
  const config = overrides?.config || loadConfig();
  const logger = overrides?.logger || createLogger(config);
  const db = overrides?.db !== undefined ? overrides.db : createDatabaseClient(config, logger);

  let publisher = overrides?.publisher;
  if (!publisher && config.messaging?.enabled) {
    publisher = new NsqPublisher(config, logger);
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
    app.post('/auth/register', createRegisterController(db, logger, publisher));
    app.post('/auth/login', createLoginController(db, logger, publisher));
    app.post('/auth/refresh', createRefreshController(db, logger));
    app.post('/auth/forgot-password', createForgotPasswordController(db, logger, publisher));
    app.get('/auth/me', createMeController(db, logger));
  }

  // ── Error handler ──────────────────────────────────────────────────────
  app.use(createErrorHandler(logger));

  return { app, db, logger, config, publisher };
}
