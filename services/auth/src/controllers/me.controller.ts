import { Request, Response } from 'express';
import { DatabaseClient, Logger } from '@microservices-template/shared';
import { verifyAccessToken } from '../utils/jwt';

export function createMeController(db: DatabaseClient, logger: Logger) {
  return async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    try {
      const token = authHeader.split(' ')[1];
      const payload = verifyAccessToken(token);

      const rows = await db.query<Array<{ id: number; email: string; name: string; role: string; created_at: string }>>(
        'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
        [payload.userId],
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(rows[0]);
    } catch (err) {
      logger.error({ err }, 'Get me failed');
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}
