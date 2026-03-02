import {
  NsqSubscriber,
  NsqPublisher,
  Topics,
  Logger,
  EventEnvelope,
  UserRegisteredPayload,
  UserPasswordResetRequestedPayload,
  EmailSentPayload,
  EmailFailedPayload,
} from '@microservices-template/shared';
import { MailSender } from './sender';
import { loadEmailConfig, renderTemplate } from './config';

export function registerSubscriptions(
  subscriber: NsqSubscriber,
  publisher: NsqPublisher,
  sender: MailSender,
  logger: Logger,
): void {
  const emailConfig = loadEmailConfig();

  // ── user.registered → welcome email ────────────────────────────────────
  subscriber.on<UserRegisteredPayload>(Topics.USER_REGISTERED, async (event: EventEnvelope<UserRegisteredPayload>) => {
    const { email, name } = event.data;
    const tpl = emailConfig.templates['welcome'];
    if (!tpl) {
      logger.warn('No "welcome" email template configured — skipping');
      return;
    }

    const subject = renderTemplate(tpl.subject, { appName: emailConfig.fromName, name });
    const body = renderTemplate(tpl.body, { appName: emailConfig.fromName, name });

    try {
      await sender.send({ to: email, subject, text: body });
      await publisher.publish<EmailSentPayload>(Topics.EMAIL_SENT, {
        to: email, subject, template: 'welcome',
      });
    } catch (err) {
      logger.error({ err, email }, 'Failed to send welcome email');
      await publisher.publish<EmailFailedPayload>(Topics.EMAIL_FAILED, {
        to: email, subject, error: String(err),
      }).catch(() => {});
    }
  });

  // ── user.password-reset-requested → reset email ────────────────────────
  subscriber.on<UserPasswordResetRequestedPayload>(Topics.USER_PASSWORD_RESET_REQUESTED, async (event: EventEnvelope<UserPasswordResetRequestedPayload>) => {
    const { email, resetToken } = event.data;
    const tpl = emailConfig.templates['passwordReset'];
    if (!tpl) {
      logger.warn('No "passwordReset" email template configured — skipping');
      return;
    }

    const subject = renderTemplate(tpl.subject, { appName: emailConfig.fromName });
    const body = renderTemplate(tpl.body, { resetToken, appName: emailConfig.fromName });

    try {
      await sender.send({ to: email, subject, text: body });
      await publisher.publish<EmailSentPayload>(Topics.EMAIL_SENT, {
        to: email, subject, template: 'passwordReset',
      });
    } catch (err) {
      logger.error({ err, email }, 'Failed to send reset email');
      await publisher.publish<EmailFailedPayload>(Topics.EMAIL_FAILED, {
        to: email, subject, error: String(err),
      }).catch(() => {});
    }
  });
}
