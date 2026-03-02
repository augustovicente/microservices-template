import express from 'express';
import cors from 'cors';
import {
  loadConfig,
  createLogger,
  createPrometheusMiddleware,
  createHealthRouter,
  createErrorHandler,
  NsqPublisher,
  NsqSubscriber,
  Logger,
  ServiceConfig,
} from '@microservices-template/shared';
import { createMailSender, MailSender } from './sender';
import { loadEmailConfig } from './config';
import { registerSubscriptions } from './subscribers';

export interface AppContext {
  app: express.Application;
  logger: Logger;
  config: ServiceConfig;
  publisher?: NsqPublisher;
  subscriber?: NsqSubscriber;
  sender: MailSender;
}

export function createApp(overrides?: Partial<AppContext>): AppContext {
  const config = overrides?.config || loadConfig();
  const logger = overrides?.logger || createLogger(config);

  const emailConfig = loadEmailConfig();
  const sender = overrides?.sender || createMailSender(emailConfig, logger);

  let publisher = overrides?.publisher;
  let subscriber = overrides?.subscriber;

  if (config.messaging?.enabled) {
    publisher = publisher || new NsqPublisher(config, logger);
    subscriber = subscriber || new NsqSubscriber(config, logger);
    registerSubscriptions(subscriber, publisher, sender, logger);
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
    app.use(createHealthRouter({ logger }));
  }

  // ── Routes ──────────────────────────────────────────────────────────────
  app.get('/ping', (_req, res) => res.send('pong'));

  // Manual send endpoint (optional — most emails are event-driven)
  app.post('/email/send', async (req, res) => {
    const { to, subject, text, html } = req.body;
    if (!to || !subject || !text) {
      return res.status(400).json({ error: 'to, subject and text are required' });
    }
    try {
      await sender.send({ to, subject, text, html });
      res.json({ message: 'Email sent' });
    } catch (err) {
      logger.error({ err }, 'Manual send failed');
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  app.use(createErrorHandler(logger));

  return { app, logger, config, publisher, subscriber, sender };
}
