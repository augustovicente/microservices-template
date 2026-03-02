import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { DatabaseClient, Logger, NsqPublisher, Topics, UserPasswordResetRequestedPayload } from '@microservices-template/shared';

export function createForgotPasswordController(db: DatabaseClient, logger: Logger, publisher?: NsqPublisher) {
  return async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    try {
      const rows = await db.query<Array<{ id: number; email: string }>>(
        'SELECT id, email FROM users WHERE email = ?',
        [email],
      );

      // Always return 200 to avoid user-enumeration
      if (rows.length === 0) {
        return res.json({ message: 'If the email exists, a reset link has been sent' });
      }

      const user = rows[0];
      const resetToken = randomBytes(32).toString('hex');

      // Publish event — the email service handles sending
      if (publisher) {
        const payload: UserPasswordResetRequestedPayload = {
          userId: user.id,
          email: user.email,
          resetToken,
        };
        publisher.publish(Topics.USER_PASSWORD_RESET_REQUESTED, payload).catch((err) =>
          logger.error({ err }, 'Failed to publish password-reset event'),
        );
      }

      logger.info({ userId: user.id }, 'Password reset requested');
      res.json({ message: 'If the email exists, a reset link has been sent' });
    } catch (err) {
      logger.error({ err }, 'Forgot password failed');
      res.status(500).json({ error: 'Internal error' });
    }
  };
}
