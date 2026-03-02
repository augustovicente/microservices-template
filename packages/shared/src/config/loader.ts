import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';
import { serviceConfigSchema, ServiceConfig } from './schema';

/**
 * Load service configuration from a YAML file with environment variable overrides.
 *
 * Resolution order (highest priority wins):
 *   1. Environment variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, SERVICE_PORT, LOG_LEVEL)
 *   2. Values defined in service.config.yaml
 *   3. Schema defaults
 */
export function loadConfig(basePath?: string): ServiceConfig {
  const configPath = resolve(basePath || process.cwd(), 'service.config.yaml');

  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const raw = readFileSync(configPath, 'utf-8');
  let parsed = yaml.load(raw) as Record<string, unknown>;

  parsed = applyEnvOverrides(parsed);

  const result = serviceConfigSchema.safeParse(parsed);
  if (!result.success) {
    const messages = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid service config:\n${messages.join('\n')}`);
  }

  return result.data;
}

function applyEnvOverrides(config: Record<string, unknown>): Record<string, unknown> {
  const env = process.env;

  // Database overrides
  if (config.database && typeof config.database === 'object') {
    const db = config.database as Record<string, unknown>;
    if (env.DB_HOST) db.host = env.DB_HOST;
    if (env.DB_PORT) db.port = parseInt(env.DB_PORT, 10);
    if (env.DB_NAME) db.name = env.DB_NAME;
    if (env.DB_USER) db.user = env.DB_USER;
    if (env.DB_PASSWORD) db.password = env.DB_PASSWORD;
  }

  // Service overrides
  if (config.service && typeof config.service === 'object') {
    const svc = config.service as Record<string, unknown>;
    if (env.SERVICE_PORT) svc.port = parseInt(env.SERVICE_PORT, 10);
    if (env.LOG_LEVEL) svc.logLevel = env.LOG_LEVEL;
  }

  // Messaging overrides
  if (config.messaging && typeof config.messaging === 'object') {
    const msg = config.messaging as Record<string, unknown>;
    if (env.NSQD_HOST) msg.nsqdHost = env.NSQD_HOST;
    if (env.NSQD_HTTP_PORT) msg.nsqdHttpPort = parseInt(env.NSQD_HTTP_PORT, 10);
    if (env.NSQ_LOOKUPD_HOST) msg.nsqLookupdHost = env.NSQ_LOOKUPD_HOST;
    if (env.NSQ_LOOKUPD_HTTP_PORT) msg.nsqLookupdHttpPort = parseInt(env.NSQ_LOOKUPD_HTTP_PORT, 10);
  }

  return config;
}

export { ServiceConfig, serviceConfigSchema };
