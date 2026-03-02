import pino from 'pino';
import { ServiceConfig } from '../config/schema';

export type Logger = pino.Logger;

export function createLogger(config: ServiceConfig): Logger {
  return pino({
    name: config.service.name,
    level: config.service.logLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
