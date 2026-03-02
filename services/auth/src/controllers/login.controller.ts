import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { DatabaseClient, Logger, NsqPublisher, Topics, UserLoginPayload } from '@microservices-template/shared';
import { signAccessToken, signRefreshToken } from '../utils/jwt';

export function createLoginController(db: DatabaseClient, logger: Logger, publisher?: NsqPublisher) {
  return async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    try {
      const rows = await db.query<Array<{ id: number; email: string; password_hash: string; role: string }>>(
        'SELECT id, email, password_hash, role FROM users WHERE email = ?',
        [email],
      );

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const tokenPayload = { userId: user.id, email: user.email, role: user.role };
      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      // Store refresh token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      await db.execute(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, refreshToken, expiresAt],
      );

      // Publish event
      if (publisher) {
        const payload: UserLoginPayload = { userId: user.id, email: user.email, ip: req.ip || 'unknown' };
        publisher.publish(Topics.USER_LOGIN, payload).catch((err) =>
          logger.error({ err }, 'Failed to publish user.login'),
        );
      }

      logger.info({ userId: user.id }, 'User logged in');
      res.json({ accessToken, refreshToken });
    } catch (err) {
      logger.error({ err }, 'Login failed');
      res.status(500).json({ error: 'Login failed' });
    }
  };
}
