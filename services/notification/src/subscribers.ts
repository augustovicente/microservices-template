import {
  NsqSubscriber, Logger, DatabaseClient, NsqPublisher,
  Topics,
  UserRegisteredPayload,
  UserPasswordResetRequestedPayload,
  DocumentUploadedPayload,
  NotificationCreatedPayload,
} from '@microservices-template/shared';

export function registerSubscriptions(
  subscriber: NsqSubscriber,
  db: DatabaseClient,
  logger: Logger,
  publisher?: NsqPublisher,
): void {
  // ── User registered → welcome notification ──────────────────────
  subscriber.on<UserRegisteredPayload>(Topics.USER_REGISTERED, async (msg) => {
    const { userId, email } = msg.data;
    logger.info({ userId, email }, 'Creating welcome notification');

    await db.execute(
      'INSERT INTO notifications (user_id, type, title, body, channel) VALUES (?, ?, ?, ?, ?)',
      [userId, 'welcome', 'Welcome!', `Welcome to the platform, ${email}!`, 'in_app'],
    );

    await publishCreated(publisher, logger, userId, 'welcome');
  });

  // ── Password reset requested → notification ─────────────────────
  subscriber.on<UserPasswordResetRequestedPayload>(Topics.USER_PASSWORD_RESET_REQUESTED, async (msg) => {
    const { email } = msg.data;
    logger.info({ email }, 'Creating password-reset notification');

    // We don't have userId from the event payload (by design – anti-enumeration),
    // so this becomes a system-level notification only.
  });

  // ── Document uploaded → notification ────────────────────────────
  subscriber.on<DocumentUploadedPayload>(Topics.DOCUMENT_UPLOADED, async (msg) => {
    const { documentId, filename, uploadedBy } = msg.data;
    if (!uploadedBy) return;

    logger.info({ documentId, uploadedBy }, 'Creating document-uploaded notification');

    await db.execute(
      'INSERT INTO notifications (user_id, type, title, body, channel, metadata) VALUES (?, ?, ?, ?, ?, ?)',
      [uploadedBy, 'document_uploaded', 'Document Uploaded', `Your document "${filename}" was uploaded successfully.`, 'in_app', JSON.stringify({ documentId })],
    );

    await publishCreated(publisher, logger, uploadedBy, 'document_uploaded');
  });
}

async function publishCreated(publisher: NsqPublisher | undefined, logger: Logger, userId: number, type: string) {
  if (!publisher) return;
  const payload: NotificationCreatedPayload = { userId, type, channel: 'in_app' };
  publisher.publish(Topics.NOTIFICATION_CREATED, payload).catch((err) =>
    logger.error({ err }, 'Failed to publish notification.created'),
  );
}
