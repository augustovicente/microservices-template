import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { resolve } from 'path';
import { mkdirSync, existsSync } from 'fs';
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
import { loadDocumentConfig } from './config';
import { createUploadController } from './controllers/upload.controller';
import { createDownloadController } from './controllers/download.controller';
import { createDeleteController } from './controllers/delete.controller';

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

  const docConfig = loadDocumentConfig();

  // Ensure upload directory exists
  const uploadDir = resolve(docConfig.storage.local?.uploadDir || './uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  const upload = multer({
    dest: uploadDir,
    limits: { fileSize: docConfig.upload.maxSizeMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (docConfig.upload.allowedMimeTypes.length === 0) {
        return cb(null, true);
      }
      cb(null, docConfig.upload.allowedMimeTypes.includes(file.mimetype));
    },
  });

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
    app.post('/documents/upload', upload.single('file'), createUploadController(db, logger, publisher));
    app.get('/documents/:id/download', createDownloadController(db, logger));
    app.delete('/documents/:id', createDeleteController(db, logger, publisher));

    // List documents
    app.get('/documents', async (_req, res) => {
      try {
        const rows = await db.query('SELECT id, original_name, mime_type, size_bytes, created_at FROM documents ORDER BY created_at DESC');
        res.json(rows);
      } catch (err) {
        logger.error({ err }, 'List documents failed');
        res.status(500).json({ error: 'Failed to list documents' });
      }
    });
  }

  app.use(createErrorHandler(logger));

  return { app, db, logger, config, publisher };
}
