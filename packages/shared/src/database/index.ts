import { ServiceConfig } from '../config/schema';
import { Logger } from '../logger';
import { createMySQLClient, DatabaseClient } from './mysql';

export type { DatabaseClient };

export function createDatabaseClient(config: ServiceConfig, logger: Logger): DatabaseClient | null {
  switch (config.database.type) {
    case 'mysql':
      return createMySQLClient(config, logger);
    case 'postgres':
      logger.warn('Postgres support coming soon — contributions welcome!');
      return null;
    case 'none':
      logger.info('No database configured');
      return null;
    default:
      throw new Error(`Unsupported database type: ${config.database.type}`);
  }
}
