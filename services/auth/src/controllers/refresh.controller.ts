import { Request, Response } from 'express';
import { DatabaseClient, Logger } from '@microservices-template/shared';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '../utils/jwt';

export function createRefreshController(db: DatabaseClient, logger: Logger) {
  return async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    try {
      // Verify the token is valid
      const payload = verifyRefreshToken(refreshToken);

      // Check it exists in DB (not revoked)
      const rows = await db.query<Array<{ id: number }>>(
        'SELECT id FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
        [refreshToken],
      );

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }

      // Rotate: delete old token, issue new pair
      await db.execute('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);

      const tokenPayload = { userId: payload.userId, email: payload.email, role: payload.role };
      const newAccessToken = signAccessToken(tokenPayload);
      const newRefreshToken = signRefreshToken(tokenPayload);

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      await db.execute(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [payload.userId, newRefreshToken, expiresAt],
      );

      logger.info({ userId: payload.userId }, 'Token refreshed');
      res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
      logger.error({ err }, 'Token refresh failed');
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  };
}
