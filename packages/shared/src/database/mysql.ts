import mysql from 'mysql2/promise';
import { ServiceConfig } from '../config/schema';
import { Logger } from '../logger';

export interface DatabaseClient {
  query<T = any>(sql: string, params?: any[]): Promise<T>;
  execute<T = any>(sql: string, params?: any[]): Promise<T>;
  close(): Promise<void>;
  getPool(): mysql.Pool;
}

export function createMySQLClient(config: ServiceConfig, logger: Logger): DatabaseClient {
  const dbConfig = config.database;

  const pool = mysql.createPool({
    host: dbConfig.host,
    port: dbConfig.port || 3306,
    database: dbConfig.name,
    user: dbConfig.user,
    password: dbConfig.password,
    connectionLimit: dbConfig.poolSize || 10,
    waitForConnections: true,
    queueLimit: 0,
  });

  logger.info(`MySQL pool created for ${dbConfig.host}:${dbConfig.port || 3306}/${dbConfig.name}`);

  return {
    async query<T = any>(sql: string, params?: any[]): Promise<T> {
      const [rows] = await pool.query(sql, params);
      return rows as T;
    },

    async execute<T = any>(sql: string, params?: any[]): Promise<T> {
      const [result] = await pool.execute(sql, params ?? []);
      return result as T;
    },

    async close(): Promise<void> {
      await pool.end();
      logger.info('MySQL pool closed');
    },

    getPool(): mysql.Pool {
      return pool;
    },
  };
}
