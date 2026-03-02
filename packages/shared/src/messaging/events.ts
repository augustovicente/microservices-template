/**
 * Well-known event topics used across services.
 * Services publish and subscribe to these topics to communicate.
 *
 * Convention: <domain>.<action> in past tense.
 */
export const Topics = {
  // Auth
  USER_REGISTERED: 'user.registered',
  USER_LOGIN: 'user.login',
  USER_PASSWORD_RESET_REQUESTED: 'user.password-reset-requested',

  // Email
  EMAIL_SENT: 'email.sent',
  EMAIL_FAILED: 'email.failed',

  // Documents
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_DELETED: 'document.deleted',

  // Notifications
  NOTIFICATION_CREATED: 'notification.created',

  // Logs
  LOG_CREATED: 'log.created',
} as const;

export type TopicName = (typeof Topics)[keyof typeof Topics];

/**
 * Base envelope for all events flowing through NSQ.
 */
export interface EventEnvelope<T = unknown> {
  /** Unique event ID */
  id: string;
  /** Topic name */
  topic: TopicName;
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Service that emitted the event */
  source: string;
  /** Event payload */
  data: T;
}

// ── Payload types per topic ──────────────────────────────────────────────

export interface UserRegisteredPayload {
  userId: number;
  email: string;
  name: string;
  roles: string[];
}

export interface UserLoginPayload {
  userId: number;
  email: string;
  ip: string;
}

export interface UserPasswordResetRequestedPayload {
  userId: number;
  email: string;
  resetToken: string;
}

export interface EmailSentPayload {
  to: string;
  subject: string;
  template: string;
}

export interface EmailFailedPayload {
  to: string;
  subject: string;
  error: string;
}

export interface DocumentUploadedPayload {
  documentId: number;
  filename: string;
  mimeType: string;
  size: number;
  uploadedBy?: number;
}

export interface DocumentDeletedPayload {
  documentId: number;
  deletedBy?: number;
}

export interface NotificationCreatedPayload {
  userId: number;
  type: string;
  channel: string;
}
