import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { DatabaseClient, Logger, NsqPublisher, Topics, UserRegisteredPayload } from '@microservices-template/shared';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { loadAuthConfig } from '../config';

export function createRegisterController(db: DatabaseClient, logger: Logger, publisher?: NsqPublisher) {
  return async (req: Request, res: Response) => {
    const { email, name, password, role } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'email, name and password are required' });
    }

    const authConfig = loadAuthConfig();
    const assignedRole = role && authConfig.roles.includes(role) ? role : authConfig.defaultRole;

    try {
      // Check duplicate
      const existing = await db.query<Array<{ id: number }>>('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const result = await db.execute<{ insertId: number }>(
        'INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)',
        [email, name, passwordHash, assignedRole],
      );

      const userId = result.insertId;
      const tokenPayload = { userId, email, role: assignedRole };
      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      // Store refresh token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      await db.execute(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [userId, refreshToken, expiresAt],
      );

      // Publish event
      if (publisher) {
        const payload: UserRegisteredPayload = { userId, email, name, roles: [assignedRole] };
        publisher.publish(Topics.USER_REGISTERED, payload).catch((err) =>
          logger.error({ err }, 'Failed to publish user.registered'),
        );
      }

      logger.info({ userId, email }, 'User registered');
      res.status(201).json({ userId, accessToken, refreshToken });
    } catch (err) {
      logger.error({ err }, 'Registration failed');
      res.status(500).json({ error: 'Registration failed' });
    }
  };
}
