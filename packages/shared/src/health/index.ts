import { Request, Response, Router } from 'express';
import { DatabaseClient } from '../database';
import { Logger } from '../logger';

interface HealthCheckOptions {
  db?: DatabaseClient | null;
  logger: Logger;
  checks?: Record<string, () => Promise<boolean>>;
}

export function createHealthRouter(options: HealthCheckOptions): Router {
  const router = Router();
  const { db, logger, checks = {} } = options;

  /**
   * GET /health — overall service health (liveness).
   * Returns 200 if OK, 503 if any check is degraded.
   */
  router.get('/health', async (_req: Request, res: Response) => {
    const status: Record<string, string> = { status: 'ok' };

    if (db) {
      try {
        await db.query('SELECT 1');
        status.database = 'connected';
      } catch (err) {
        status.database = 'disconnected';
        status.status = 'degraded';
        logger.error({ err }, 'Health check: database unreachable');
      }
    }

    for (const [name, check] of Object.entries(checks)) {
      try {
        const ok = await check();
        status[name] = ok ? 'ok' : 'failing';
        if (!ok) status.status = 'degraded';
      } catch {
        status[name] = 'error';
        status.status = 'degraded';
      }
    }

    const httpStatus = status.status === 'ok' ? 200 : 503;
    res.status(httpStatus).json(status);
  });

  /**
   * GET /ready — readiness probe for orchestrators (K8s, etc.).
   * Returns 200 only when the service can accept traffic.
   */
  router.get('/ready', async (_req: Request, res: Response) => {
    if (db) {
      try {
        await db.query('SELECT 1');
        res.status(200).json({ ready: true });
      } catch {
        res.status(503).json({ ready: false });
      }
    } else {
      res.status(200).json({ ready: true });
    }
  });

  return router;
}
