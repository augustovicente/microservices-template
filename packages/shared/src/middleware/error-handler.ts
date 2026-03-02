import { NextFunction, Request, Response } from 'express';
import { Logger } from '../logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public override message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function createErrorHandler(logger: Logger) {
  return function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof AppError) {
      logger.warn({ err, path: req.path, method: req.method }, err.message);
      res.status(err.statusCode).json({
        error: {
          message: err.message,
          code: err.code || 'UNKNOWN_ERROR',
        },
      });
      return;
    }

    logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
    res.status(500).json({
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    });
  };
}
