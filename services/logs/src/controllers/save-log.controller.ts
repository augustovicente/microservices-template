import { Request, Response } from 'express';
import { DatabaseClient, Logger } from '@microservices-template/shared';

export function createSaveLogController(db: DatabaseClient, logger: Logger) {
  return async (req: Request, res: Response) => {
    const body = req.body;
    if (!body) {
      return res.status(400).json({ error: 'Missing request body' });
    }

    const { user_id: userId, application_name: applicationName, message, label, code, metadata } = body;

    if (!applicationName || !message || !label || !code || !metadata) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const origin =
        req.headers.origin || req.ip || req.ips?.join(',') || req.hostname || 'unknown';

      await db.execute(
        'INSERT INTO logs (user_id, application_name, message, label, code, metadata, timestamp, origin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, applicationName, message, label, code, metadata, timestamp, origin],
      );

      logger.info({ applicationName, label, code }, 'Log saved');
      res.status(201).json({ message: 'Log saved' });
    } catch (error) {
      logger.error({ error }, 'Error saving log');
      res.status(500).json({ error: 'Error saving log' });
    }
  };
}
