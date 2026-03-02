import nodemailer from 'nodemailer';
import { Logger } from '@microservices-template/shared';
import { EmailServiceConfig } from './config';

export interface MailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailSender {
  send(payload: MailPayload): Promise<void>;
}

export function createMailSender(emailConfig: EmailServiceConfig, logger: Logger): MailSender {
  if (emailConfig.provider === 'smtp') {
    return createSmtpSender(emailConfig, logger);
  }
  // Extend here for sendgrid, ses, etc.
  throw new Error(`Unsupported email provider: ${emailConfig.provider}`);
}

function createSmtpSender(emailConfig: EmailServiceConfig, logger: Logger): MailSender {
  const smtp = emailConfig.smtp;
  if (!smtp) throw new Error('SMTP config missing');

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    ...(smtp.user && smtp.password
      ? { auth: { user: smtp.user, pass: smtp.password } }
      : {}),
  });

  return {
    async send(payload: MailPayload): Promise<void> {
      await transport.sendMail({
        from: `"${emailConfig.fromName}" <${emailConfig.from}>`,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
      logger.info({ to: payload.to, subject: payload.subject }, 'Email sent via SMTP');
    },
  };
}
