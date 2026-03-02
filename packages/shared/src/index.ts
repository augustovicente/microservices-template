// Config
export { loadConfig } from './config/loader';
export { serviceConfigSchema } from './config/schema';
export type { ServiceConfig } from './config/schema';

// Database
export { createDatabaseClient } from './database';
export type { DatabaseClient } from './database';

// Logger
export { createLogger } from './logger';
export type { Logger } from './logger';

// Health
export { createHealthRouter } from './health';

// Middleware
export { createPrometheusMiddleware } from './middleware/prometheus';
export { createErrorHandler, AppError } from './middleware/error-handler';

// Migrations
export { runMigrations } from './migration/runner';

// Messaging
export { NsqPublisher, NsqSubscriber, Topics } from './messaging';
export type {
  TopicName,
  EventEnvelope,
  UserRegisteredPayload,
  UserLoginPayload,
  UserPasswordResetRequestedPayload,
  EmailSentPayload,
  EmailFailedPayload,
  DocumentUploadedPayload,
  DocumentDeletedPayload,
  NotificationCreatedPayload,
} from './messaging';
